import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import useSocket from '../hooks/useSocket';
import { paymentService } from '../services';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Plus, X, CreditCard, CheckCircle, XCircle, FileText, User as UserIcon, Calendar, Check } from 'lucide-react';
import jsPDF from 'jspdf';

const StatusBadge = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'verified': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', text: 'Verified' };
      case 'rejected': return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', text: 'Rejected' };
      case 'player_marked': return { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', text: 'Marked Done' };
      case 'cash_paid': return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', text: 'Cash Paid' };
      default: return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'Pending' };
    }
  };
  const { bg, color, text } = getBadgeStyle();
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
      {text}
    </span>
  );
};

const Payments = () => {
  const { user } = useAuthStore();
  const { team } = useTeamStore();
  const socket = useSocket();

  // Role resolution
  const myRoleInTeam = user?.teams?.find(
    t => (t.teamId?._id || t.teamId)?.toString() === team?._id?.toString()
  )?.role;
  const isManager = myRoleInTeam === 'manager' ||
    (team?.createdBy?._id || team?.createdBy)?.toString() === user?._id?.toString();

  const [activeTab, setActiveTab] = useState(isManager ? 'requests' : 'dues');
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [myLedger, setMyLedger] = useState(null);

  // Modals
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showMarkDone, setShowMarkDone] = useState(false);
  const [showMarkCash, setShowMarkCash] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Forms
  const [wizardStep, setWizardStep] = useState(1);
  const [createdRequestData, setCreatedRequestData] = useState(null);
  const [requestForm, setRequestForm] = useState({ dueAmount: '', notes: '', playerIds: [], cashPaidIds: [] });
  const [verifyNote, setVerifyNote] = useState('');
  const [markDoneForm, setMarkDoneForm] = useState({ amount: '', paymentMode: 'upi', utrNumber: '' });
  const [markCashAmount, setMarkCashAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize request form playerIds when team loads
  useEffect(() => {
    if (team?.players && requestForm.playerIds.length === 0) {
      setRequestForm(prev => ({ ...prev, playerIds: team.players.map(p => p._id) }));
    }
  }, [team]);

  const loadData = async () => {
    if (!team) return;
    setLoading(true);
    try {
      if (isManager) {
        if (activeTab === 'requests' || activeTab === 'verify') {
          const res = await paymentService.getRequests();
          setRequests(res.data.requests);
        } else if (activeTab === 'ledger') {
          const res = await paymentService.getAllLedgers();
          setLedgers(res.data.ledgers);
        }
      } else {
        if (activeTab === 'dues') {
          const [ledgerRes, reqRes] = await Promise.all([
            paymentService.getMyLedger(),
            paymentService.getMyRequests()
          ]);
          setMyLedger(ledgerRes.data.ledger);
          setRequests(reqRes.data.requests);
        } else if (activeTab === 'history') {
          const res = await paymentService.getMyRequests();
          setRequests(res.data.requests);
        }
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [team, activeTab, isManager]);

  useEffect(() => {
    if (!socket || !team) return;
    const handleCreated = (req) => {
      setRequests(prev => [req, ...prev]);
      if (activeTab === 'ledger' || (!isManager && activeTab === 'dues')) loadData();
    };
    const handleUpdated = (req) => {
      setRequests(prev => prev.map(p => p._id === req._id ? req : p));
      if (activeTab === 'ledger' || (!isManager && activeTab === 'dues')) loadData();
    };

    socket.on('payment_request_created', handleCreated);
    socket.on('payment_request_updated', handleUpdated);
    return () => {
      socket.off('payment_request_created', handleCreated);
      socket.off('payment_request_updated', handleUpdated);
    };
  }, [socket, team, activeTab, isManager]);

  // Derived lists
  const verifyList = useMemo(() => {
    const list = [];
    requests.forEach(req => {
      req.players.forEach(p => {
        if (p.status === 'player_marked') {
          list.push({ requestId: req._id, requestDate: req.date, dueAmount: req.dueAmount, ...p });
        }
      });
    });
    return list;
  }, [requests]);

  const myPendingDues = useMemo(() => {
    const list = [];
    requests.forEach(req => {
      const me = req.players.find(p => p.userId?._id === user._id || p.userId === user._id);
      if (me && (me.status === 'pending' || me.status === 'rejected')) {
        list.push({ requestId: req._id, requestDate: req.date, dueAmount: req.dueAmount, notes: req.notes, ...me });
      }
    });
    return list;
  }, [requests, user._id]);

  const myHistory = useMemo(() => {
    const list = [];
    requests.forEach(req => {
      const me = req.players.find(p => p.userId?._id === user._id || p.userId === user._id);
      if (me && me.status !== 'pending' && me.status !== 'rejected') {
        list.push({ requestId: req._id, requestDate: req.date, dueAmount: req.dueAmount, notes: req.notes, ...me });
      }
    });
    return list;
  }, [requests, user._id]);

  // Actions
  const handleCreateRequest = async () => {
    setSubmitting(true);
    try {
      const res = await paymentService.createRequest({ ...requestForm, cashPaidUserIds: requestForm.cashPaidIds });
      toast.success('Payment request created!');
      setCreatedRequestData(res.data.request);
      setWizardStep(4);
      setRequestForm({ dueAmount: '', notes: '', playerIds: team.players.map(p => p._id), cashPaidIds: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating request');
    } finally { setSubmitting(false); }
  };

  const exportRequestPDF = () => {
    if (!createdRequestData) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text(`${team?.name} - Payment Request`, 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${formatDateTime(createdRequestData.date)}`, 20, 30);
    doc.text(`Due Amount: ${formatCurrency(createdRequestData.dueAmount)}`, 20, 40);
    doc.text(`Total Players: ${createdRequestData.players.length}`, 20, 50);
    
    let y = 60;
    createdRequestData.players.forEach((p, i) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const statusText = p.status === 'verified' && p.paymentMode === 'cash' ? 'Paid (Cash)' : 'Pending';
      doc.text(`${i + 1}. ${p.userId?.username || 'Unknown'} - ${statusText}`, 20, y);
      y += 10;
    });
    
    doc.save(`Request_${formatDateTime(createdRequestData.date).replace(/[/,: ]/g, '_')}.pdf`);
    toast.success('PDF Exported!');
  };

  const exportLedgerPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text(`${team?.name} - Pending Dues Ledger`, 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    let y = 35;
    const sorted = ledgers.slice().sort((a, b) => b.pendingAmount - a.pendingAmount);
    sorted.forEach((l, i) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${l.userId?.username || 'Unknown'} - Due: ${formatCurrency(l.pendingAmount)} (Advance: ${formatCurrency(l.advanceBalance)})`, 20, y);
      y += 10;
    });
    
    doc.save(`Ledger_${team?.name}.pdf`);
    toast.success('PDF Exported!');
  };

  const handleVerify = async (action) => {
    setSubmitting(true);
    try {
      await paymentService.verify({
        requestId: selectedEntry.requestId,
        userId: selectedEntry.userId._id || selectedEntry.userId,
        action,
        rejectionNote: verifyNote
      });
      toast.success(action === 'verified' ? 'Payment Verified!' : 'Payment Rejected!');
      setShowVerify(false);
      setVerifyNote('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error verifying');
    } finally { setSubmitting(false); }
  };

  const handleMarkCash = async () => {
    if (!markCashAmount) return toast.error('Amount required');
    setSubmitting(true);
    try {
      await paymentService.markCash(selectedEntry.requestId, selectedEntry.userId._id || selectedEntry.userId, markCashAmount);
      toast.success('Marked as cash paid!');
      setShowMarkCash(false);
      setMarkCashAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setSubmitting(false); }
  };

  const handleMarkDone = async () => {
    if (!markDoneForm.amount) return toast.error('Amount required');
    setSubmitting(true);
    try {
      await paymentService.markDone({
        requestId: selectedEntry.requestId,
        amount: markDoneForm.amount,
        paymentMode: markDoneForm.paymentMode,
        utrNumber: markDoneForm.utrNumber
      });
      toast.success('Payment marked as done!');
      setShowMarkDone(false);
      setMarkDoneForm({ amount: '', paymentMode: 'upi', utrNumber: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally { setSubmitting(false); }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--color-text)', borderRadius: '10px', padding: '10px 12px',
    width: '100%', outline: 'none', fontSize: '14px',
  };

  const bottomSheetStyle = {
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
  };

  if (!team) return <Layout><div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted)' }}>Select a team first</div></Layout>;

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Payments</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {isManager ? 'Manage team finances' : 'Your payment dues'}
            </p>
          </div>
          {isManager && activeTab === 'requests' && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAddRequest(true)}
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <Plus size={20} color="white" />
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(isManager ? ['requests', 'verify', 'ledger'] : ['dues', 'history']).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm"
              style={{
                background: activeTab === tab ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                color: activeTab === tab ? '#fff' : 'var(--color-muted)',
                border: '1px solid',
                borderColor: activeTab === tab ? 'transparent' : 'rgba(255,255,255,0.1)',
              }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'verify' && verifyList.length > 0 && (
                <span className="ml-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">{verifyList.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* MANAGER: REQUESTS */}
            {isManager && activeTab === 'requests' && (
              requests.length === 0 ? <p className="text-center text-sm mt-10" style={{ color: 'var(--color-muted)' }}>No payment requests yet.</p> :
              requests.map((req, i) => (
                <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  className="glass p-4 rounded-2xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Daily Request</h3>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        <Calendar size={12} /> {formatDateTime(req.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: '#10b981' }}>{formatCurrency(req.dueAmount)}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Per Player</p>
                    </div>
                  </div>
                  {req.notes && <p className="text-xs mb-3 p-2 rounded-lg bg-black/20" style={{ color: 'var(--color-muted)' }}>{req.notes}</p>}
                  
                  <div className="space-y-2 mt-4">
                    {req.players.map(p => (
                      <div key={p.userId?._id} className="flex items-center justify-between p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-text)' }}>
                            {p.userId?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.userId?.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={p.status} />
                          {(p.status === 'pending' || p.status === 'rejected') && (
                            <button onClick={() => { setSelectedEntry({ ...p, requestId: req._id }); setMarkCashAmount(req.dueAmount); setShowMarkCash(true); }}
                              className="text-[10px] px-2 py-1 rounded-md font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
                              Cash
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))
            )}

            {/* MANAGER: VERIFY */}
            {isManager && activeTab === 'verify' && (
              verifyList.length === 0 ? <p className="text-center text-sm mt-10" style={{ color: 'var(--color-muted)' }}>No pending verifications.</p> :
              verifyList.map((entry, i) => (
                <motion.div key={`${entry.requestId}-${entry.userId._id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  className="glass p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        {entry.userId?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{entry.userId?.username}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Marked Done • {entry.paymentMode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg" style={{ color: '#10b981' }}>{formatCurrency(entry.paidAmount)}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Due: {formatCurrency(entry.dueAmount)}</p>
                    </div>
                  </div>
                  {entry.utrNumber && <p className="text-xs p-2 rounded-lg bg-black/20 font-mono" style={{ color: 'var(--color-muted)' }}>UTR: {entry.utrNumber}</p>}
                  <button onClick={() => { setSelectedEntry(entry); setShowVerify(true); }}
                    className="w-full py-2.5 mt-1 rounded-xl text-xs font-bold shadow-sm"
                    style={{ background: 'var(--color-primary)', color: 'white' }}>
                    Review Payment
                  </button>
                </motion.div>
              ))
            )}

            {/* MANAGER: LEDGER */}
            {isManager && activeTab === 'ledger' && (
              ledgers.length === 0 ? <p className="text-center text-sm mt-10" style={{ color: 'var(--color-muted)' }}>No ledger data found.</p> :
              <>
                <div className="flex justify-end mb-2">
                  <button onClick={exportLedgerPDF} className="flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>
                    <FileText size={14} /> Export List
                  </button>
                </div>
                {ledgers.slice().sort((a, b) => b.pendingAmount - a.pendingAmount).map((l, i) => (
                  <motion.div key={l._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                    className="glass p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-text)' }}>
                        {l.userId?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{l.userId?.username}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total Paid: {formatCurrency(l.totalPaid)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {l.pendingAmount > 0 ? (
                        <p className="font-black text-sm text-red-400">Due: {formatCurrency(l.pendingAmount)}</p>
                      ) : l.advanceBalance > 0 ? (
                        <p className="font-black text-sm text-green-400">Advance: {formatCurrency(l.advanceBalance)}</p>
                      ) : (
                        <p className="font-black text-sm text-gray-400">Settled</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* PLAYER: MY DUES */}
            {!isManager && activeTab === 'dues' && (
              <>
                <div className="glass p-5 rounded-2xl mb-2 flex items-center justify-between shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))' }}>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>Total Pending</p>
                    <p className="text-3xl font-black" style={{ color: myLedger?.pendingAmount > 0 ? '#ef4444' : '#10b981' }}>
                      {formatCurrency(myLedger?.pendingAmount || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>Advance</p>
                    <p className="text-xl font-bold" style={{ color: '#818cf8' }}>{formatCurrency(myLedger?.advanceBalance || 0)}</p>
                  </div>
                </div>

                {myPendingDues.length === 0 ? <p className="text-center text-sm mt-8" style={{ color: 'var(--color-muted)' }}>No pending requests.</p> :
                  <p className="text-xs font-bold mt-2 ml-1" style={{ color: 'var(--color-muted)' }}>ACTIVE REQUESTS</p>
                }
                {myPendingDues.map((req, i) => (
                  <motion.div key={req.requestId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                    className="glass p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Payment Request</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatDateTime(req.requestDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg" style={{ color: '#ef4444' }}>{formatCurrency(req.dueAmount)}</p>
                        {req.status === 'rejected' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 mt-1 inline-block">🔴 Rejected</span>}
                      </div>
                    </div>
                    {req.notes && <p className="text-xs bg-black/20 p-2 rounded-lg" style={{ color: 'var(--color-muted)' }}>{req.notes}</p>}
                    
                    <div className="flex gap-2 mt-2">
                      {team?.upiId && (
                        <a href={`upi://pay?pa=${team.upiId}&pn=${team.name}&am=${req.dueAmount}`}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          Pay via UPI
                        </a>
                      )}
                      <button onClick={() => { setSelectedEntry(req); setMarkDoneForm({ amount: req.dueAmount, paymentMode: 'upi', utrNumber: '' }); setShowMarkDone(true); }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                        style={{ background: 'var(--color-primary)', color: 'white' }}>
                        Mark Done
                      </button>
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* PLAYER: HISTORY */}
            {!isManager && activeTab === 'history' && (
              myHistory.length === 0 ? <p className="text-center text-sm mt-10" style={{ color: 'var(--color-muted)' }}>No payment history.</p> :
              myHistory.map((entry, i) => (
                <motion.div key={entry.requestId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  className="glass p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Payment Request</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatDateTime(entry.requestDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base" style={{ color: 'var(--color-text)' }}>{formatCurrency(entry.paidAmount || entry.dueAmount)}</p>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                  {entry.rejectionNote && entry.status === 'rejected' && (
                    <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg mt-1">{entry.rejectionNote}</p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Add Request Modal */}
      <AnimatePresence>
        {showAddRequest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center" style={bottomSheetStyle}
            onClick={(e) => e.target === e.currentTarget && setShowAddRequest(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="glass w-full max-w-lg rounded-t-3xl" style={{ maxHeight: '85vh', overflowY: 'auto', padding: '24px 24px 32px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>New Request</h2>
                <button onClick={() => setShowAddRequest(false)}><X size={20} color="var(--color-muted)" /></button>
              </div>
              <div className="flex flex-col gap-4">
                {wizardStep === 1 && (
                  <>
                    <p className="text-xs text-center font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Step 1: Setup & Attendance</p>
                    <div>
                      <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Due Amount (₹) per Player *</label>
                      <input style={inputStyle} type="number" placeholder="e.g. 500" value={requestForm.dueAmount}
                        onChange={e => setRequestForm({ ...requestForm, dueAmount: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Notes (optional)</label>
                      <input style={inputStyle} placeholder="e.g. Weekend match fee" value={requestForm.notes}
                        onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs mb-2 block font-medium" style={{ color: 'var(--color-muted)' }}>Players Present ({requestForm.playerIds.length})</label>
                      <div className="max-h-48 overflow-y-auto rounded-xl p-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {team?.players?.map(p => (
                          <div key={p._id} onClick={() => {
                            setRequestForm(prev => ({
                              ...prev,
                              playerIds: prev.playerIds.includes(p._id) ? prev.playerIds.filter(id => id !== p._id) : [...prev.playerIds, p._id]
                            }))
                          }} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5">
                            <input type="checkbox" checked={requestForm.playerIds.includes(p._id)} readOnly className="accent-primary" />
                            <span className="text-sm" style={{ color: 'var(--color-text)' }}>{team.playerAliases?.[p._id] || p.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => {
                      if (!requestForm.dueAmount || requestForm.playerIds.length === 0) return toast.error('Amount and at least one player required');
                      setWizardStep(2);
                    }}
                      className="w-full py-3 mt-2 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
                      style={{ background: 'var(--color-primary)' }}>
                      Next Step
                    </button>
                  </>
                )}
                {wizardStep === 2 && (
                  <>
                    <p className="text-xs text-center font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Step 2: Paid in Cash ({requestForm.cashPaidIds.length})</p>
                    <p className="text-xs text-center mb-2" style={{ color: 'var(--color-muted)' }}>Select players who already paid ₹{requestForm.dueAmount} in cash today.</p>
                    <div className="max-h-60 overflow-y-auto rounded-xl p-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {team?.players?.filter(p => requestForm.playerIds.includes(p._id)).map(p => (
                        <div key={p._id} onClick={() => {
                          setRequestForm(prev => ({
                            ...prev,
                            cashPaidIds: prev.cashPaidIds.includes(p._id) ? prev.cashPaidIds.filter(id => id !== p._id) : [...prev.cashPaidIds, p._id]
                          }))
                        }} className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm" style={{ color: 'var(--color-text)' }}>{team.playerAliases?.[p._id] || p.username}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${requestForm.cashPaidIds.includes(p._id) ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                            {requestForm.cashPaidIds.includes(p._id) && <Check size={14} color="white" />}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setWizardStep(1)} className="py-3 px-4 rounded-xl font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>Back</button>
                      <button onClick={() => setWizardStep(3)} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95" style={{ background: 'var(--color-primary)' }}>Review Summary</button>
                    </div>
                  </>
                )}
                {wizardStep === 3 && (
                  <>
                    <p className="text-xs text-center font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Step 3: Summary</p>
                    <div className="glass p-4 rounded-2xl mb-2">
                      <div className="flex justify-between mb-3">
                        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Total Present</span>
                        <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{requestForm.playerIds.length}</span>
                      </div>
                      <div className="flex justify-between mb-3">
                        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Cash Collected</span>
                        <span className="font-bold text-sm text-green-400">₹{requestForm.cashPaidIds.length * Number(requestForm.dueAmount)} ({requestForm.cashPaidIds.length})</span>
                      </div>
                      <div className="flex justify-between pt-3 mt-1 border-t border-white/10">
                        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Pending to Request</span>
                        <span className="font-bold text-sm text-red-400">₹{(requestForm.playerIds.length - requestForm.cashPaidIds.length) * Number(requestForm.dueAmount)} ({requestForm.playerIds.length - requestForm.cashPaidIds.length})</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setWizardStep(2)} className="py-3 px-4 rounded-xl font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>Back</button>
                      <button onClick={handleCreateRequest} disabled={submitting} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95" style={{ background: '#10b981' }}>
                        {submitting ? 'Creating...' : 'Submit Request'}
                      </button>
                    </div>
                  </>
                )}
                {wizardStep === 4 && (
                  <div className="text-center py-6">
                    <CheckCircle size={64} color="#10b981" className="mx-auto mb-4" />
                    <h3 className="text-xl font-black mb-2" style={{ color: '#10b981' }}>Payment Request Sent!</h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>The request has been sent to {requestForm.playerIds.length - requestForm.cashPaidIds.length} players.</p>
                    <div className="flex gap-2">
                      <button onClick={exportRequestPDF} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <FileText size={16} /> Export PDF
                      </button>
                      <button onClick={() => { setShowAddRequest(false); setWizardStep(1); }} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg" style={{ background: 'var(--color-primary)' }}>
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verify Modal */}
      <AnimatePresence>
        {showVerify && selectedEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center" style={bottomSheetStyle}
            onClick={(e) => e.target === e.currentTarget && setShowVerify(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="glass w-full max-w-lg rounded-t-3xl" style={{ padding: '24px 24px 32px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>Verify Payment</h2>
                <button onClick={() => setShowVerify(false)}><X size={20} color="var(--color-muted)" /></button>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{selectedEntry.userId?.username} claims to have paid</p>
                <p className="text-4xl font-black mt-2" style={{ color: '#10b981' }}>{formatCurrency(selectedEntry.paidAmount)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Mode: {selectedEntry.paymentMode?.toUpperCase()}</p>
                {selectedEntry.utrNumber && <p className="text-xs mt-1 font-mono bg-black/20 p-1 inline-block rounded">UTR: {selectedEntry.utrNumber}</p>}
              </div>
              <div className="mb-4">
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Rejection Note (optional)</label>
                <input style={inputStyle} placeholder="Reason for rejection" value={verifyNote} onChange={e => setVerifyNote(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleVerify('verified')} disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle size={18} /> Approve
                </button>
                <button onClick={() => handleVerify('rejected')} disabled={submitting}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <XCircle size={18} /> Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark Cash Modal */}
      <AnimatePresence>
        {showMarkCash && selectedEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center" style={bottomSheetStyle}
            onClick={(e) => e.target === e.currentTarget && setShowMarkCash(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="glass w-full max-w-lg rounded-t-3xl" style={{ padding: '24px 24px 32px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>Mark Cash Paid</h2>
                <button onClick={() => setShowMarkCash(false)}><X size={20} color="var(--color-muted)" /></button>
              </div>
              <div className="mb-4">
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Amount Paid by {selectedEntry.userId?.username}</label>
                <input style={inputStyle} type="number" value={markCashAmount} onChange={e => setMarkCashAmount(e.target.value)} />
              </div>
              <button onClick={handleMarkCash} disabled={submitting}
                className="w-full py-3 rounded-xl font-bold text-white shadow-lg"
                style={{ background: '#10b981' }}>
                Confirm Cash Received
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark Done Modal */}
      <AnimatePresence>
        {showMarkDone && selectedEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center" style={bottomSheetStyle}
            onClick={(e) => e.target === e.currentTarget && setShowMarkDone(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
              className="glass w-full max-w-lg rounded-t-3xl" style={{ padding: '24px 24px 32px' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>Mark Payment Done</h2>
                <button onClick={() => setShowMarkDone(false)}><X size={20} color="var(--color-muted)" /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Amount Paid (₹) *</label>
                  <input style={inputStyle} type="number" value={markDoneForm.amount} onChange={e => setMarkDoneForm({ ...markDoneForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['upi', 'cash'].map(m => (
                      <button key={m} onClick={() => setMarkDoneForm({ ...markDoneForm, paymentMode: m })}
                        className="py-2 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: markDoneForm.paymentMode === m ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                          color: markDoneForm.paymentMode === m ? '#818cf8' : 'var(--color-muted)',
                          border: `1px solid ${markDoneForm.paymentMode === m ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        {m === 'upi' ? '📱 UPI' : '💵 Cash'}
                      </button>
                    ))}
                  </div>
                </div>
                {markDoneForm.paymentMode === 'upi' && (
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>UTR Number / Ref (optional)</label>
                    <input style={inputStyle} placeholder="12-digit UPI ref" value={markDoneForm.utrNumber} onChange={e => setMarkDoneForm({ ...markDoneForm, utrNumber: e.target.value })} />
                  </div>
                )}
                <button onClick={handleMarkDone} disabled={submitting}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                  style={{ background: 'var(--color-primary)' }}>
                  Submit for Verification
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Payments;
