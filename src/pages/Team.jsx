import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import { teamService } from '../services';
import { getInitials, getRoleColor } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  Users, Plus, X, UserCheck, UserX, Shield,
  Copy, Check, ChevronDown, Star, Repeat2, Edit2, Trash2
} from 'lucide-react';

const Team = () => {
  const { user, fetchMe } = useAuthStore();
  const { team, fetchTeam, setTeam } = useTeamStore();
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [createForm, setCreateForm] = useState({ name: '', description: '', upiId: '' });
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [selectedAliasUser, setSelectedAliasUser] = useState(null);
  const [aliasForm, setAliasForm] = useState('');

  // Determine role in current team based on teams[] array
  const myRoleInTeam = user?.teams?.find(
    t => t.teamId?._id === team?._id || t.teamId === team?._id
  )?.role || null;

  const isManager = myRoleInTeam === 'manager';
  const isCreator = team?.createdBy?._id === user?._id || team?.createdBy === user?._id;
  const canManage = isManager || isCreator;

  useEffect(() => {
    loadMyTeams();
  }, []);

  const loadMyTeams = async () => {
    try {
      const res = await teamService.getMyTeams();
      setMyTeams(res.data.teams || []);
    } catch { /* user has no teams yet */ }
  };

  const handleCreate = async () => {
    if (!createForm.name) return toast.error('Team name required');
    setLoading(true);
    try {
      const res = await teamService.create(createForm);
      setTeam(res.data.team);
      toast.success(`Team "${res.data.team.name}" created! 🏏 You are the manager.`);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', upiId: '' });
      await fetchMe();   // refresh user.teams[]
      await fetchTeam(); // refresh active team
      loadMyTeams();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinCode) return toast.error('Enter team code');
    setLoading(true);
    try {
      await teamService.join(joinCode);
      toast.success('Join request sent! Wait for manager approval.');
      setShowJoin(false);
      setJoinCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (userId, action) => {
    try {
      const res = await teamService.approve(userId, action);
      setTeam(res.data.team);
      toast.success(action === 'approve' ? '✅ Player approved!' : 'Request rejected');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handlePromote = async (userId, currentRole) => {
    const newRole = currentRole === 'manager' ? 'player' : 'manager';
    try {
      const res = await teamService.promote(userId, newRole);
      setTeam(res.data.team);
      toast.success(`Role updated to ${newRole}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSwitchTeam = async (teamId) => {
    try {
      const res = await teamService.switchTeam(teamId);
      setTeam(res.data.team);
      setShowSwitcher(false);
      toast.success(`Switched to ${res.data.team.name}`);
      await fetchMe();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemovePlayer = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this player from the team?')) return;
    try {
      const res = await teamService.removePlayer(userId);
      setTeam(res.data.team);
      toast.success('Player removed');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleUpdateAlias = async () => {
    if (!selectedAliasUser) return;
    setLoading(true);
    try {
      const res = await teamService.updateAlias(selectedAliasUser._id, aliasForm);
      setTeam(res.data.team);
      toast.success('Alias updated');
      setShowAliasModal(false);
      setSelectedAliasUser(null);
      setAliasForm('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(team.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--color-text)', borderRadius: '10px', padding: '10px 12px',
    width: '100%', outline: 'none', fontSize: '14px',
  };

  const overlayStyle = {
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
  };

  // ── No team yet ──────────────────────────────────────────────────────────────
  if (!team) {
    return (
      <Layout>
        <div style={{ padding: '16px' }}>
          <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--color-text)' }}>Team</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            Create a team to become manager, or join one with a code.
          </p>
          <div className="text-center py-10">
            <Users size={64} className="mx-auto mb-4 opacity-20" color="var(--color-text)" />
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>No Active Team</p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
              You can create multiple teams or join existing ones
            </p>
            <div className="flex flex-col gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCreate(true)}
                className="py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Plus size={18} /> Create Team (You'll be Manager)
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowJoin(true)}
                className="py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.1)' }}>
                🔗 Join Team as Player
              </motion.button>
            </div>
          </div>

          {/* Create Modal */}
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center" style={overlayStyle}
                onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="glass w-full max-w-lg rounded-t-3xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Create Team</h2>
                      <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>You'll be assigned Manager role</p>
                    </div>
                    <button onClick={() => setShowCreate(false)}><X size={20} color="var(--color-muted)" /></button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Team Name *</label>
                      <input style={inputStyle} placeholder="e.g. Thunder Warriors" value={createForm.name}
                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Description</label>
                      <input style={inputStyle} placeholder="Short description" value={createForm.description}
                        onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Team UPI ID (optional)</label>
                      <input style={inputStyle} placeholder="team@upi" value={createForm.upiId}
                        onChange={e => setCreateForm({ ...createForm, upiId: e.target.value })} />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={loading}
                      className="w-full py-3 rounded-xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                      {loading ? '⏳ Creating...' : '🏏 Create Team'}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Join Modal */}
          <AnimatePresence>
            {showJoin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end justify-center" style={overlayStyle}
                onClick={e => e.target === e.currentTarget && setShowJoin(false)}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="glass w-full max-w-lg rounded-t-3xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Join Team</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>You'll be assigned Player role</p>
                    </div>
                    <button onClick={() => setShowJoin(false)}><X size={20} color="var(--color-muted)" /></button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Team Code</label>
                      <input style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
                        placeholder="ABC123" value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin} disabled={loading}
                      className="w-full py-3 rounded-xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                      {loading ? '⏳ Sending...' : '🔗 Send Join Request'}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    );
  }

  // ── Has active team ──────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '16px' }}>

        {/* Team header card */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-5 mb-4 overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-xl"
            style={{ background: '#6ee7b7', transform: 'translate(30%,-30%)' }} />

          {/* Name + my role badge */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">{team.name}</h1>
              {team.description && <p className="text-sm opacity-70 mt-0.5">{team.description}</p>}
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-bold mt-1 flex-shrink-0"
              style={{ background: isManager ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)', color: 'white' }}>
              {isManager ? '⭐ Manager' : '🏏 Player'}
            </span>
          </div>

          {/* Code */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs opacity-60">Code:</span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.1)' }} onClick={copyCode}>
              <span className="font-mono font-bold text-sm text-white">{team.code}</span>
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} color="rgba(255,255,255,0.6)" />}
            </div>
          </div>

          <div className="flex gap-4 mt-2">
            <p className="text-xs opacity-60">{team.players?.length || 0} Members</p>
            <p className="text-xs opacity-60">{team.managers?.length || 0} Managers</p>
          </div>
        </motion.div>

        {/* Action row: Create another team / Join another / Switch */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Plus size={14} /> New Team
          </button>
          <button onClick={() => setShowJoin(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
            🔗 Join Another
          </button>
          {myTeams.length > 1 && (
            <button onClick={() => setShowSwitcher(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Repeat2 size={14} /> Switch Team
            </button>
          )}
        </div>

        {/* Pending requests — visible to managers */}
        {canManage && team.pendingRequests?.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-3" style={{ color: '#f59e0b' }}>
              ⏳ Pending Requests ({team.pendingRequests.length})
            </h3>
            <div className="flex flex-col gap-2">
              {team.pendingRequests.map(p => (
                <div key={p._id} className="glass p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                      {getInitials(p.username)}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.username}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.mobile}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(p._id, 'approve')}
                      className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      <UserCheck size={16} />
                    </button>
                    <button onClick={() => handleApprove(p._id, 'reject')}
                      className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members list */}
        <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
          Members ({team.players?.length || 0})
        </h3>
        <div className="flex flex-col gap-2 mb-4">
          {team.players?.map((p, i) => {
            const isThisMgr = team.managers?.some(m => (m._id || m).toString() === p._id.toString());
            const isThisCreator = (team.createdBy?._id || team.createdBy)?.toString() === p._id.toString();
            const memberRole = isThisMgr ? 'manager' : 'player';
            const roleColor = getRoleColor(memberRole);
            const isMe = p._id === user?._id;

            return (
              <motion.div key={p._id}
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.04 } }}
                className="glass p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: `${roleColor}20`, color: roleColor }}>
                    {getInitials(p.username)}
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {team.playerAliases?.[p._id] ? `${team.playerAliases[p._id]} (${p.username})` : p.username} {isMe && <span style={{ color: 'var(--color-muted)', fontSize: 11 }}>(you)</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${roleColor}20`, color: roleColor }}>
                    {isThisMgr ? <><Star size={9} className="inline mr-0.5" />Manager</> : 'Player'}
                    {isThisCreator && <span style={{ opacity: 0.6, fontSize: 9 }}> ·creator</span>}
                  </span>
                  {/* Manager can promote/demote others, update alias, and remove */}
                  {canManage && !isMe && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePromote(p._id, memberRole)}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)' }}
                        title={isThisMgr ? 'Demote to Player' : 'Promote to Manager'}>
                        <Shield size={14} />
                      </button>
                      <button onClick={() => {
                          setSelectedAliasUser(p);
                          setAliasForm(team.playerAliases?.[p._id] || '');
                          setShowAliasModal(true);
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)' }}
                        title="Edit Alias">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleRemovePlayer(p._id)}
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                        title="Remove Player">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Modals ── */}
        {/* Create Team */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center" style={overlayStyle}
              onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="glass w-full max-w-lg rounded-t-3xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Create New Team</h2>
                    <p className="text-xs mt-0.5" style={{ color: '#10b981' }}>You'll be Manager</p>
                  </div>
                  <button onClick={() => setShowCreate(false)}><X size={20} color="var(--color-muted)" /></button>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Team Name *</label>
                    <input style={inputStyle} placeholder="e.g. Thunder Warriors" value={createForm.name}
                      onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Description</label>
                    <input style={inputStyle} placeholder="Short description" value={createForm.description}
                      onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-muted)' }}>Team UPI ID (optional)</label>
                    <input style={inputStyle} placeholder="team@upi" value={createForm.upiId}
                      onChange={e => setCreateForm({ ...createForm, upiId: e.target.value })} />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    {loading ? '⏳ Creating...' : '🏏 Create Team'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join Team */}
        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center" style={overlayStyle}
              onClick={e => e.target === e.currentTarget && setShowJoin(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="glass w-full max-w-lg rounded-t-3xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Join Team</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>You'll be assigned Player role</p>
                  </div>
                  <button onClick={() => setShowJoin(false)}><X size={20} color="var(--color-muted)" /></button>
                </div>
                <div className="flex flex-col gap-4">
                  <input style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
                    placeholder="ABC123" value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())} />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin} disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    {loading ? '⏳ Sending...' : '🔗 Send Join Request'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team Switcher */}
        <AnimatePresence>
          {showSwitcher && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center" style={overlayStyle}
              onClick={e => e.target === e.currentTarget && setShowSwitcher(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="glass w-full max-w-lg rounded-t-3xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Switch Team</h2>
                  <button onClick={() => setShowSwitcher(false)}><X size={20} color="var(--color-muted)" /></button>
                </div>
                <div className="flex flex-col gap-2">
                  {myTeams.map(t => (
                    <button key={t._id} onClick={() => handleSwitchTeam(t._id)}
                      className="flex items-center justify-between p-4 rounded-xl text-left"
                      style={{
                        background: t._id === team?._id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${t._id === team?._id ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {t.myRole === 'manager' ? '⭐ Manager' : '🏏 Player'} · {t.code}
                        </p>
                      </div>
                      {t._id === team?._id && <Check size={16} color="#10b981" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Alias Modal */}
        <AnimatePresence>
          {showAliasModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowAliasModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="glass w-full max-w-sm p-6 rounded-3xl relative">
                <button onClick={() => setShowAliasModal(false)} className="absolute top-4 right-4">
                  <X size={20} color="var(--color-muted)" />
                </button>
                <h2 className="text-lg font-black mb-4" style={{ color: 'var(--color-text)' }}>Edit Player Name</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>This sets a team-specific alias for {selectedAliasUser?.username}. Leave blank to reset.</p>
                
                <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--color-muted)' }}>Alias (Nickname)</label>
                <input value={aliasForm} onChange={(e) => setAliasForm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors mb-4"
                  placeholder={`e.g. Captain`} />
                
                <button onClick={handleUpdateAlias} disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex justify-center items-center"
                  style={{ background: 'var(--color-primary)' }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Alias'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Team;
