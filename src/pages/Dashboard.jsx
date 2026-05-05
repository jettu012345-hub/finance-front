import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import useSocket from '../hooks/useSocket';
import { paymentService, expenseService } from '../services';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Users, Plus,
  CreditCard, Receipt, BarChart2, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.98 }}
    className="glass p-4 rounded-2xl flex-1"
    style={{ minWidth: 0 }}
  >
    <div className="flex items-start justify-between">
      <div className="p-2 rounded-xl" style={{ background: `${color}20` }}>
        <Icon size={18} color={color} />
      </div>
      {trend !== undefined && (
        <span className="text-xs font-medium" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-3">
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { user } = useAuthStore();
  const { team, fetchTeam, updateBalance } = useTeamStore();
  const navigate = useNavigate();
  const socket = useSocket();
  const [summary, setSummary] = useState({ todayCollection: 0, totalCollected: 0, teamBalance: 0, totalExpenses: 0 });
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sumRes, payRes, expRes] = await Promise.all([
        paymentService.getSummary(),
        paymentService.getAll({ status: 'verified' }),
        expenseService.getAll(),
      ]);
      setSummary(sumRes.data.summary);
      setRecentPayments(payRes.data.payments.slice(0, 5));
      setRecentExpenses(expRes.data.expenses.slice(0, 5));

      // Build last 7 days chart
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      const chart = days.map((d) => {
        const dayPayments = payRes.data.payments.filter(p =>
          new Date(p.date).toDateString() === d.toDateString()
        );
        const dayExpenses = expRes.data.expenses.filter(e =>
          new Date(e.date).toDateString() === d.toDateString()
        );
        return {
          day: d.toLocaleDateString('en', { weekday: 'short' }),
          collected: dayPayments.reduce((s, p) => s + p.amount, 0),
          expenses: dayExpenses.reduce((s, e) => s + e.amount, 0),
        };
      });
      setChartData(chart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('payment_verified', ({ payment, teamBalance }) => {
      updateBalance(teamBalance);
      setSummary(s => ({ ...s, teamBalance, todayCollection: s.todayCollection + payment.amount }));
      toast.success(`✅ Payment verified: ${formatCurrency(payment.amount)}`);
      loadData();
    });
    socket.on('payment_added', () => loadData());
    socket.on('expense_added', ({ teamBalance }) => {
      updateBalance(teamBalance);
      loadData();
    });
    return () => {
      socket.off('payment_verified');
      socket.off('payment_added');
      socket.off('expense_added');
    };
  }, [socket]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{greeting()},</p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>
            {user?.username} 🏏
          </h1>
          {!team && (
            <div className="mt-3 p-4 rounded-2xl glass flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No team yet. Create or join one!</p>
              <button onClick={() => navigate('/team')} className="text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                Team →
              </button>
            </div>
          )}
        </motion.div>

        {/* Hero Balance Card */}
        {team && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl p-5 mb-5"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-xl"
              style={{ background: '#6ee7b7', transform: 'translate(30%,-30%)' }} />
            <p className="text-sm opacity-70">Team Balance</p>
            <motion.p key={team.balance} initial={{ scale: 1.05 }} animate={{ scale: 1 }}
              className="text-4xl font-black my-2" style={{ color: 'white' }}>
              {formatCurrency(team.balance)}
            </motion.p>
            <p className="text-xs opacity-60">{team.name}</p>
            <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div>
                <p className="text-xs opacity-60">Collected</p>
                <p className="text-sm font-bold text-white">{formatCurrency(summary.totalCollected)}</p>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                <p className="text-xs opacity-60">Expenses</p>
                <p className="text-sm font-bold text-white">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                <p className="text-xs opacity-60">Today</p>
                <p className="text-sm font-bold text-white">{formatCurrency(summary.todayCollection)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard icon={TrendingUp} label="Today's Collection" value={formatCurrency(summary.todayCollection)} color="#10b981" />
          <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(summary.totalExpenses)} color="#f59e0b" />
          <StatCard icon={Wallet} label="Team Balance" value={formatCurrency(summary.teamBalance)} color="#6366f1" />
          <StatCard icon={Users} label="Members" value={team ? `${team.players?.length || 0}` : '0'} color="#ec4899" />
        </div>

        {/* Quick Actions — replaces fixed FABs for better mobile reach */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/payments')}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl font-bold text-xs"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
            <CreditCard size={20} /><span>Payments</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/expenses')}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl font-bold text-xs"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}>
            <Receipt size={20} /><span>Expenses</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate('/reports')}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl font-bold text-xs"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
            <BarChart2 size={20} /><span>Reports</span>
          </motion.button>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="glass p-4 rounded-2xl mb-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} color="#10b981" />
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Last 7 Days</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f9fafb' }} />
                <Area type="monotone" dataKey="collected" stroke="#10b981" fill="url(#cGrad)" strokeWidth={2} name="Collected" />
                <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="url(#eGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Recent Payments */}
        {recentPayments.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Recent Payments</h3>
              <button onClick={() => navigate('/payments')} className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {recentPayments.map((p, i) => (
                <motion.div key={p._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
                  className="glass p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                      {p.userId?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.userId?.username}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.paymentMode} · {formatDate(p.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: '#10b981' }}>{formatCurrency(p.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.status}`}>{p.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* bottom padding */}
        <div style={{ height: 8 }} />
      </div>
    </Layout>
  );
};

export default Dashboard;
