import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import useSocket from '../hooks/useSocket';
import { expenseService } from '../services';
import { formatCurrency, formatDate, getCategoryIcon } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, X, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORIES = ['water', 'juice', 'equipment', 'ground', 'other'];
const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];

const Expenses = () => {
  const { user } = useAuthStore();
  const { team, updateBalance } = useTeamStore();
  const socket = useSocket();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'water', customCategory: '', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const myRoleInTeam = user?.teams?.find(
    t => (t.teamId?._id || t.teamId)?.toString() === team?._id?.toString()
  )?.role;
  const isManager = myRoleInTeam === 'manager' ||
    (team?.createdBy?._id || team?.createdBy)?.toString() === user?._id?.toString();

  const load = async () => {
    try {
      const res = await expenseService.getAll();
      setExpenses(res.data.expenses);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('expense_added', ({ expense, teamBalance }) => {
      setExpenses(prev => [expense, ...prev]);
      updateBalance(teamBalance);
      toast('🧾 New expense added');
    });
    return () => socket.off('expense_added');
  }, [socket]);

  const submit = async () => {
    if (!form.amount) return toast.error('Amount required');
    if (form.category === 'other' && !form.customCategory.trim()) return toast.error('Custom category name required');
    
    setSubmitting(true);
    try {
      const payload = {
        amount: form.amount,
        description: form.description,
        category: form.category === 'other' ? form.customCategory.toLowerCase() : form.category
      };
      const res = await expenseService.add(payload);
      toast.success('Expense added!');
      setExpenses(prev => [res.data.expense, ...prev]);
      updateBalance(res.data.teamBalance);
      setShowModal(false);
      setForm({ category: 'water', customCategory: '', amount: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  // Pie chart data
  const pieData = CATEGORIES.map((cat, i) => ({
    name: cat, value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0), color: COLORS[i],
  })).filter(d => d.value > 0);

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--color-text)', borderRadius: '10px', padding: '10px 12px',
    width: '100%', outline: 'none', fontSize: '14px',
  };

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Expenses</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Total: {formatCurrency(totalExpense)}</p>
          </div>
          {isManager && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowModal(true)}
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <Plus size={20} color="white" />
            </motion.button>
          )}
        </div>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f9fafb' }}
                  formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt size={48} color="var(--color-muted)" className="mx-auto mb-3 opacity-30" />
            <p style={{ color: 'var(--color-muted)' }}>No expenses yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {expenses.map((e, i) => (
              <motion.div key={e._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                className="glass p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'rgba(245,158,11,0.1)' }}>
                    {getCategoryIcon(e.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm capitalize" style={{ color: 'var(--color-text)' }}>{e.category}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {e.addedBy?.username} · {formatDate(e.date)}
                    </p>
                    {e.description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{e.description}</p>}
                  </div>
                </div>
                <p className="font-black text-lg" style={{ color: '#f59e0b' }}>-{formatCurrency(e.amount)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="glass w-full max-w-lg rounded-t-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add Expense</h2>
                <button onClick={() => setShowModal(false)}><X size={20} color="var(--color-muted)" /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--color-muted)' }}>Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, category: c })}
                        className="py-2 rounded-xl text-sm transition-all capitalize flex items-center justify-center gap-1"
                        style={{
                          background: form.category === c ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                          color: form.category === c ? '#f59e0b' : 'var(--color-muted)',
                          border: `1px solid ${form.category === c ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        {getCategoryIcon(c)} {c}
                      </button>
                    ))}
                  </div>
                  {form.category === 'other' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Custom Category Name *</label>
                      <input style={inputStyle} placeholder="e.g. Snacks" value={form.customCategory}
                        onChange={e => setForm({ ...form, customCategory: e.target.value })} />
                    </motion.div>
                  )}
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Amount (₹) *</label>
                  <input style={inputStyle} type="number" placeholder="Enter amount" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Description</label>
                  <input style={inputStyle} placeholder="Note (optional)" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={submit} disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  {submitting ? '⏳ Adding...' : '🧾 Add Expense'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Expenses;
