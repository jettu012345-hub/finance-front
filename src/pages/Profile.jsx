import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import { authService, adminService } from '../services';
import { formatDate, getInitials, getRoleColor } from '../utils/helpers';
import toast from 'react-hot-toast';
import { User, Phone, Shield, LogOut, Edit2, Check, X, BarChart2, CreditCard, Trophy, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout, setUser } = useAuthStore();
  const { team } = useTeamStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wiping, setWiping] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authService.updateProfile({ username });
      setUser(res.data.user);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const handleWipeDB = async () => {
    setWiping(true);
    try {
      const res = await adminService.resetDb();
      toast.success(res.data.message || 'Database wiped successfully!');
      setShowWipeModal(false);
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to wipe DB');
    } finally {
      setWiping(false);
    }
  };

  // Derive active team role from teams[]
  const activeEntry = user?.teams?.find(
    t => (t.teamId?._id || t.teamId)?.toString() === (user?.activeTeamId?._id || user?.activeTeamId)?.toString()
  );
  const myTeamRole = activeEntry?.role || 'user';
  const roleColor = getRoleColor(myTeamRole);

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--color-text)' }}>Profile</h1>

        {/* Avatar + info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl mb-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ background: `radial-gradient(circle at 50% 0%, ${roleColor}, transparent 70%)` }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3"
            style={{ background: `${roleColor}25`, color: roleColor, border: `2px solid ${roleColor}50` }}>
            {getInitials(user?.username)}
          </div>
          {editing ? (
            <div className="flex items-center gap-2 justify-center mb-2">
              <input value={username} onChange={e => setUsername(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '6px 12px', color: 'var(--color-text)', outline: 'none', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} />
              <button onClick={save} className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                {saving ? '...' : <Check size={16} />}
              </button>
              <button onClick={() => { setEditing(false); setUsername(user?.username); }} className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{user?.username}</h2>
              <button onClick={() => setEditing(true)} className="p-1" style={{ color: 'var(--color-muted)' }}>
                <Edit2 size={14} />
              </button>
            </div>
          )}
          <span className="text-xs px-3 py-1 rounded-full font-medium capitalize"
            style={{ background: `${roleColor}20`, color: roleColor }}>
            {myTeamRole === 'manager' ? '⭐ Manager' : myTeamRole === 'player' ? '🏏 Player' : 'No Team'}
          </span>
        </motion.div>

        {/* Details */}
        <div className="glass rounded-2xl overflow-hidden mb-4">
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Phone size={16} color="#10b981" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Mobile</p>
              <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>+91 {user?.mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Shield size={16} color="#6366f1" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Team Role</p>
              <p className="font-medium text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                {myTeamRole === 'manager' ? '⭐ Manager' : myTeamRole === 'player' ? '🏏 Player' : 'No active team'}
              </p>
            </div>
          </div>
          {/* Global Admin indicator */}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Shield size={16} color="#ef4444" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Account Level</p>
                <p className="font-bold text-sm text-red-500">System Admin</p>
              </div>
            </div>
          )}
          {/* Active team */}
          {team && (
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Trophy size={16} color="#f59e0b" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Active Team</p>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{team.name}</p>
              </div>
            </div>
          )}
          {/* All teams */}
          {user?.teams?.length > 1 && (
            <div className="px-4 py-3">
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>All Teams ({user.teams.length})</p>
              <div className="flex flex-col gap-1.5">
                {user.teams.map((t, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {t.teamId?.name || 'Team'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: t.role === 'manager' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: t.role === 'manager' ? '#10b981' : 'var(--color-muted)' }}>
                      {t.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="glass rounded-2xl overflow-hidden mb-4">
          <button onClick={() => navigate('/reports')} className="flex items-center gap-3 p-4 w-full"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text)' }}>
            <BarChart2 size={16} color="#10b981" />
            <span className="text-sm font-medium">View Reports</span>
          </button>
          <button onClick={() => navigate('/payments')} className="flex items-center gap-3 p-4 w-full" style={{ color: 'var(--color-text)' }}>
            <CreditCard size={16} color="#6366f1" />
            <span className="text-sm font-medium">My Payments</span>
          </button>
        </div>

        {/* Dangerous Zone (Admin Only) */}
        {user?.role === 'admin' && (
          <div className="glass rounded-2xl overflow-hidden mb-4 p-4" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} color="#ef4444" />
              <h3 className="font-bold text-sm text-red-500">Dangerous Zone</h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>As an admin, you can wipe the entire database. This action cannot be undone.</p>
            <button onClick={() => setShowWipeModal(true)}
              className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: '#ef4444', color: 'white' }}>
              Clear Full Database
            </button>
          </div>
        )}

        {/* Logout */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout}
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          <LogOut size={16} /> Logout
        </motion.button>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-muted)' }}>
          Member since {formatDate(user?.createdAt || new Date())}
        </p>
      </div>

      {/* Admin Wipe Modal */}
      <AnimatePresence>
        {showWipeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowWipeModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass w-full max-w-sm p-6 rounded-3xl relative" style={{ border: '1px solid rgba(239,68,68,0.5)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h2 className="text-xl font-black mb-2 text-center text-red-500">Are you sure?</h2>
              <p className="text-sm text-center mb-6" style={{ color: 'var(--color-muted)' }}>
                This action will delete all teams, payments, expenses, and users. <b>This cannot be undone.</b>
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setShowWipeModal(false)} disabled={wiping}
                  className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  Cancel
                </button>
                <button onClick={handleWipeDB} disabled={wiping}
                  className="flex-1 py-3 rounded-xl font-bold flex justify-center items-center" style={{ background: '#ef4444', color: 'white' }}>
                  {wiping ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Yes, Delete All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Profile;
