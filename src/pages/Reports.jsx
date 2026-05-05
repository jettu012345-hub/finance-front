import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useTeamStore from '../store/teamStore';
import { reportService } from '../services';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { BarChart2, Download, Calendar, TrendingUp, TrendingDown, Users, Clipboard, Check } from 'lucide-react';
import jsPDF from 'jspdf';

const Reports = () => {
  const { team } = useTeamStore();
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build plain-text version (shared by PDF and clipboard)
  const buildReportText = () => {
    if (!report) return '';
    const lines = [`${team?.name} — ${tab === 'daily' ? 'Daily' : 'Full'} Report`];
    if (tab === 'daily') {
      lines.push(`Date: ${formatDate(report.date)}`);
      lines.push(`Team Balance: ${formatCurrency(report.teamBalance)}`);
      lines.push(`Today Collected: ${formatCurrency(report.totalCollected)}`);
      lines.push(`Today Expenses: ${formatCurrency(report.totalExpenses)}`);
      lines.push(`Pending: ${formatCurrency(report.pendingAmount)}`);
      if (report.payments?.length) {
        lines.push('\nPayments:');
        report.payments.forEach(p => lines.push(`  • ${p.userId?.username} — ${formatCurrency(p.amount)} (${p.status})`));
      }
    } else {
      lines.push(`Total Members: ${report.totalMembers}`);
      lines.push(`Total Collected: ${formatCurrency(report.totalCollected)}`);
      lines.push(`Total Expenses: ${formatCurrency(report.totalExpenses)}`);
      lines.push(`Team Balance: ${formatCurrency(report.teamBalance)}`);
      if (report.playerSummary?.length) {
        lines.push('\nPlayer Summary:');
        report.playerSummary.forEach(p => lines.push(`  • ${p.player.username} — ${formatCurrency(p.totalPaid)} (${p.count} payments)`));
      }
    }
    return lines.join('\n');
  };

  const loadReport = async () => {
    if (!team) return toast.error('Join a team first');
    setLoading(true);
    try {
      if (tab === 'daily') {
        const res = await reportService.daily(date);
        setReport(res.data.report);
      } else {
        const res = await reportService.full();
        setReport(res.data.report);
      }
    } catch (err) {
      toast.error('Failed to load report');
    } finally { setLoading(false); }
  };

  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text(`${team?.name} - ${tab === 'daily' ? 'Daily' : 'Full'} Report`, 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const text = buildReportText();
    const lines = text.split('\n').slice(1); // skip title (already drawn)
    lines.forEach((line, i) => doc.text(line, 20, 35 + i * 10));
    doc.save(`${team?.name}_${tab}_report_${date || 'full'}.pdf`);
    toast.success('PDF downloaded!');
  };

  const copyToClipboard = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Reports</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Analytics & exports</p>
          </div>
          {report && (
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={exportPDF}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Download size={14} /> PDF
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={copyToClipboard}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', color: copied ? '#10b981' : 'var(--color-muted)', border: '1px solid ' + (copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)') }}>
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {['daily', 'full'].map(t => (
            <button key={t} onClick={() => { setTab(t); setReport(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize"
              style={{
                background: tab === t ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
                color: tab === t ? 'white' : 'var(--color-muted)',
              }}>
              {t === 'daily' ? '📅 Daily' : '📊 Full'}
            </button>
          ))}
        </div>

        {/* Date picker for daily */}
        {tab === 'daily' && (
          <div className="glass p-3 rounded-xl mb-4 flex items-center gap-3">
            <Calendar size={16} color="#10b981" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', flex: 1, fontSize: '14px' }} />
          </div>
        )}

        <motion.button whileTap={{ scale: 0.97 }} onClick={loadReport} disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white mb-5 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          {loading ? '⏳ Loading...' : <><BarChart2 size={16} /> Generate Report</>}
        </motion.button>

        {/* Report display */}
        {report && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} color="#10b981" />
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Collected</p>
                </div>
                <p className="text-xl font-black" style={{ color: '#10b981' }}>{formatCurrency(report.totalCollected)}</p>
              </div>
              <div className="glass p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={14} color="#f59e0b" />
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Expenses</p>
                </div>
                <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{formatCurrency(report.totalExpenses)}</p>
              </div>
            </div>

            <div className="glass p-4 rounded-2xl mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Team Balance</p>
                  <p className="text-2xl font-black gradient-text">{formatCurrency(report.teamBalance)}</p>
                </div>
                {report.pendingAmount > 0 && (
                  <div className="text-right">
                    <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Pending</p>
                    <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(report.pendingAmount)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Player summary for full report */}
            {tab === 'full' && report.playerSummary && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Users size={14} /> Player Summary
                </h3>
                <div className="flex flex-col gap-2">
                  {report.playerSummary.sort((a, b) => b.totalPaid - a.totalPaid).map((p, i) => (
                    <div key={p.player._id} className="glass p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold w-5" style={{ color: 'var(--color-muted)' }}>#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.player.username}</p>
                          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.count} payments</p>
                        </div>
                      </div>
                      <p className="font-bold" style={{ color: '#10b981' }}>{formatCurrency(p.totalPaid)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments list */}
            {report.payments?.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Payments ({report.payments.length})</h3>
                <div className="flex flex-col gap-2">
                  {report.payments.slice(0, 10).map(p => (
                    <div key={p._id} className="glass p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.userId?.username}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatDate(p.date)} · {p.paymentMode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: '#10b981' }}>{formatCurrency(p.amount)}</p>
                        <span className={`text-xs badge-${p.status} px-2 py-0.5 rounded-full`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
