import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import { authService } from '../services';
import toast from 'react-hot-toast';
import {
  User, Phone, Camera, CreditCard, QrCode, Download, Bell,
  Shield, Eye, LogOut, Trash2, ChevronRight, Check, X,
  Users, MessageCircle, AlertTriangle, Settings as SettingsIcon
} from 'lucide-react';
import QRCode from 'qrcode';

/* ─── Reusable Toggle ──────────────────────────────────────────────────────── */
const Toggle = ({ value, onChange }) => (
  <motion.button
    onClick={() => onChange(!value)}
    className="relative flex-shrink-0"
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.1)',
      border: '1px solid ' + (value ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'),
      transition: 'background 0.25s',
    }}
  >
    <motion.div
      animate={{ x: value ? 22 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        position: 'absolute', top: 2, width: 18, height: 18,
        borderRadius: '50%', background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }}
    />
  </motion.button>
);

/* ─── Section Card ─────────────────────────────────────────────────────────── */
const Section = ({ icon: Icon, title, color = '#10b981', children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-2xl overflow-hidden mb-4"
  >
    <div className="flex items-center gap-3 px-4 pt-4 pb-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}>
        <Icon size={16} color={color} />
      </div>
      <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{title}</p>
    </div>
    <div>{children}</div>
  </motion.div>
);

/* ─── Row ──────────────────────────────────────────────────────────────────── */
const Row = ({ label, sub, right, onClick, danger }) => (
  <div
    onClick={onClick}
    className="flex items-center justify-between px-4 py-3"
    style={{
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <div>
      <p className="text-sm font-medium" style={{ color: danger ? '#ef4444' : 'var(--color-text)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</p>}
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-4">{right}</div>
  </div>
);

/* ─── Main Component ───────────────────────────────────────────────────────── */
const Settings = () => {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  // Role is team-scoped. Derive from user.teams[] using the activeTeamId.
  const activeEntry = user?.teams?.find(
    t => (t.teamId?._id || t.teamId)?.toString() === (user?.activeTeamId?._id || user?.activeTeamId)?.toString()
  );
  const myTeamRole = activeEntry?.role || null;  // 'manager' | 'player' | null
  const isManager = myTeamRole === 'manager';
  const isPlayer  = myTeamRole === 'player';

  /* ── Local state ── */
  const [username, setUsername] = useState(user?.username || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [notif, setNotif] = useState({
    paymentPendingAlerts:   user?.notificationPrefs?.paymentPendingAlerts   ?? true,
    paymentReceivedConfirm: user?.notificationPrefs?.paymentReceivedConfirm ?? true,
    joinRequestAlerts:      user?.notificationPrefs?.joinRequestAlerts       ?? true,
    adminMessages:          user?.notificationPrefs?.adminMessages           ?? true,
    paymentReminders:       user?.notificationPrefs?.paymentReminders        ?? true,
    expenseUpdates:         user?.notificationPrefs?.expenseUpdates          ?? true,
    chatNotifications:      user?.notificationPrefs?.chatNotifications       ?? true,
  });
  const [privacy, setPrivacy] = useState(user?.privacySettings?.paymentVisibility || 'everyone');
  const [saving, setSaving] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const avatarInputRef = useRef();

  /* ── Auto-generate QR when UPI set ── */
  useEffect(() => {
    const upi = user?.upiId || upiId;
    if (upi) {
      QRCode.toDataURL(`upi://pay?pa=${upi}&pn=${encodeURIComponent(user?.username || '')}`, {
        width: 256, margin: 2,
        color: { dark: '#10b981', light: '#0a0f1e' },
      }).then(url => setQrDataUrl(url)).catch(() => {});
    }
  }, [upiId, user?.upiId]);

  /* ─── Save helpers ─────────────────────────────────────────────────────── */
  const save = async (field, data) => {
    setSaving(field);
    try {
      const res = await authService.updateSettings(data);
      setUser(res.data.user);
      toast.success('Settings updated ✓');
    } catch {
      toast.error('Failed to save');
    } finally { setSaving(''); }
  };

  const saveUsername = async () => {
    if (!username.trim()) return toast.error('Username cannot be empty');
    setSaving('username');
    try {
      const res = await authService.updateProfile({ username });
      setUser(res.data.user);
      toast.success('Username updated ✓');
      setEditingUsername(false);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(''); }
  };

  const saveUpi = async () => {
    if (!upiId.trim()) return toast.error('Enter a valid UPI ID');
    await save('upi', { upiId });
    setEditingUpi(false);
  };

  const saveNotif = async (key, val) => {
    const updated = { ...notif, [key]: val };
    setNotif(updated);
    await save(key, { notificationPrefs: updated });
  };

  const savePrivacy = async (val) => {
    setPrivacy(val);
    await save('privacy', { privacySettings: { paymentVisibility: val } });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setSaving('avatar');
      try {
        const res = await authService.updateProfile({ avatar: ev.target.result });
        setUser(res.data.user);
        toast.success('Profile picture updated ✓');
      } catch { toast.error('Failed to update picture'); }
      finally { setSaving(''); }
    };
    reader.readAsDataURL(file);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${user?.username || 'qr'}_upi_qr.png`;
    a.click();
    toast.success('QR Code downloaded!');
  };

  const handleDeleteAccount = async () => {
    try {
      await authService.deleteAccount();
      logout();
      toast.success('Account deleted');
      navigate('/login');
    } catch { toast.error('Failed to delete account'); }
  };

  /* ─── Input style ──────────────────────────────────────────────────────── */
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--color-text)', borderRadius: 10, padding: '9px 12px',
    flex: 1, outline: 'none', fontSize: 14,
  };

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div style={{ padding: '16px' }}>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Settings</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {myTeamRole ? (isManager ? 'Manager' : 'Player') : 'No active team'} · {user?.mobile}
            </p>
          </div>
          {/* Profile picture avatar (clickable → /profile) */}
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate('/profile')}
            className="relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', boxShadow: '0 0 16px rgba(16,185,129,0.35)' }}>
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
              : (user?.username?.[0]?.toUpperCase() || <User size={18} color="white" />)
            }
          </motion.button>
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 1 · Account Settings */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section icon={User} title="Account Settings" color="#10b981">
          {/* Username */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Username</p>
            {editingUsername ? (
              <div className="flex gap-2">
                <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                  autoFocus onKeyDown={e => e.key === 'Enter' && saveUsername()} />
                <button onClick={saveUsername} className="px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                  {saving === 'username' ? '...' : <Check size={14} />}
                </button>
                <button onClick={() => { setEditingUsername(false); setUsername(user?.username || ''); }}
                  className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X size={14} color="var(--color-muted)" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{user?.username}</p>
                <button onClick={() => setEditingUsername(true)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Edit</button>
              </div>
            )}
          </div>

          {/* Mobile — read-only */}
          <Row label="Mobile Number" sub={`+91 ${user?.mobile}`}
            right={<span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)' }}>Read-only</span>} />

          {/* Avatar */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Profile Picture</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Upload a photo</p>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => avatarInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Camera size={13} />
                {saving === 'avatar' ? 'Saving...' : 'Upload'}
              </motion.button>
            </div>
          </div>
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 2 · Payment Settings (Manager only) */}
        {/* ─────────────────────────────────────────────────────────────── */}
        {isManager && (
          <Section icon={CreditCard} title="Payment Settings" color="#6366f1">
            {/* UPI ID */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>UPI ID</p>
              {editingUpi ? (
                <div className="flex gap-2">
                  <input style={inputStyle} value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    autoFocus onKeyDown={e => e.key === 'Enter' && saveUpi()} />
                  <button onClick={saveUpi} className="px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white' }}>
                    {saving === 'upi' ? '...' : <Check size={14} />}
                  </button>
                  <button onClick={() => { setEditingUpi(false); setUpiId(user?.upiId || ''); }}
                    className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <X size={14} color="var(--color-muted)" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm" style={{ color: user?.upiId ? 'var(--color-text)' : 'var(--color-muted)' }}>
                    {user?.upiId || 'Not set'}
                  </p>
                  <button onClick={() => setEditingUpi(true)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    {user?.upiId ? 'Update' : '+ Add'}
                  </button>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={14} color="#6366f1" />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>QR Code</p>
              </div>
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-2xl" style={{ background: '#0a0f1e', border: '2px solid rgba(16,185,129,0.3)' }}>
                    <img src={qrDataUrl} alt="UPI QR Code" className="w-40 h-40" />
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                    Scan to pay · {user?.upiId || upiId}
                  </p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={downloadQR}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Download size={14} /> Download QR
                  </motion.button>
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-muted)' }}>
                  Add your UPI ID above to generate QR
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 3 · Team Preferences */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section icon={Users} title="Team Preferences" color="#f59e0b">
          <Row label="Payment Reminders" sub="Remind me about pending payments"
            right={<Toggle value={notif.paymentReminders} onChange={v => saveNotif('paymentReminders', v)} />} />
          <Row label="Expense Updates" sub="Notify when expenses are added"
            right={<Toggle value={notif.expenseUpdates} onChange={v => saveNotif('expenseUpdates', v)} />} />
          <Row label="Chat Notifications" sub="Messages in team chat"
            right={<Toggle value={notif.chatNotifications} onChange={v => saveNotif('chatNotifications', v)} />} />
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 4 · Notification Settings */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section icon={Bell} title="Notification Settings" color="#ec4899">
          <Row label="Payment Pending Alerts"
            right={<Toggle value={notif.paymentPendingAlerts} onChange={v => saveNotif('paymentPendingAlerts', v)} />} />
          <Row label="Payment Received"
            right={<Toggle value={notif.paymentReceivedConfirm} onChange={v => saveNotif('paymentReceivedConfirm', v)} />} />
          {isManager && (
            <Row label="Join Request Alerts" sub="When a player requests to join"
              right={<Toggle value={notif.joinRequestAlerts} onChange={v => saveNotif('joinRequestAlerts', v)} />} />
          )}
          <Row label="Admin Messages"
            right={<Toggle value={notif.adminMessages} onChange={v => saveNotif('adminMessages', v)} />} />
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 5 · Privacy & Security */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section icon={Shield} title="Privacy & Security" color="#34d399">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Who can see my payment status</p>
            <div className="flex gap-2">
              {[
                { val: 'everyone', label: 'Everyone' },
                { val: 'manager_only', label: 'Manager Only' },
              ].map(opt => (
                <button key={opt.val} onClick={() => savePrivacy(opt.val)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: privacy === opt.val ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
                    color: privacy === opt.val ? 'white' : 'var(--color-muted)',
                    border: '1px solid ' + (privacy === opt.val ? 'transparent' : 'rgba(255,255,255,0.1)'),
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Row label="Account Info" sub={`Member since ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}`}
            right={<Eye size={14} color="var(--color-muted)" />} />
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 6 · Danger Zone */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <Section icon={AlertTriangle} title="Danger Zone" color="#ef4444">
          <Row label="Logout" sub="Sign out of this device"
            onClick={() => { logout(); toast.success('Logged out'); navigate('/login'); }}
            right={<LogOut size={16} color="#ef4444" />} />
          <Row label="Delete Account" sub="Permanently remove all your data" danger
            onClick={() => setShowDeleteModal(true)}
            right={<Trash2 size={16} color="#ef4444" />} />
        </Section>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Delete Confirmation Modal */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
              onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 22 }}
                className="glass rounded-2xl p-6 w-full max-w-sm">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 size={26} color="#ef4444" />
                </div>
                <h3 className="text-lg font-black text-center mb-2" style={{ color: 'var(--color-text)' }}>Delete Account?</h3>
                <p className="text-sm text-center mb-6" style={{ color: 'var(--color-muted)' }}>
                  Are you sure? This will permanently remove your account, payments, and remove you from all teams. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Cancel
                  </button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={handleDeleteAccount}
                    className="flex-1 py-3 rounded-xl font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white' }}>
                    Yes, Delete
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* bottom padding for thumb reach */}
        <div style={{ height: 24 }} />
      </div>
    </Layout>
  );
};

export default Settings;
