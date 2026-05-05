import { motion } from 'framer-motion';
import useTeamStore from '../../store/teamStore';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { formatCurrency } from '../../utils/helpers';
import { Bell, Sun, Moon, LogOut, Trophy, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';

const Header = () => {
  const { team } = useTeamStore();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    setDark(!dark);
    document.body.classList.toggle('light');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-white/10"
      style={{ padding: '12px 16px' }}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Logo + Team */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Trophy size={18} color="white" />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Cricket Finance</p>
            <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
              {team?.name || user?.username || 'Welcome'}
            </p>
          </div>
        </div>

        {/* Balance Badge */}
        {team && (
          <motion.div
            key={team.balance}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: team.balance >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: team.balance >= 0 ? '#10b981' : '#ef4444',
              border: `1px solid ${team.balance >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}
          >
            {formatCurrency(team.balance)}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-xl" style={{ background: 'var(--color-card)' }}>
            <Bell size={18} color="var(--color-text)" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: '#ef4444', color: 'white', fontSize: '10px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ background: 'var(--color-card)' }}>
            {dark ? <Sun size={18} color="var(--color-text)" /> : <Moon size={18} color="var(--color-text)" />}
          </button>

          {/* Settings */}
          {user?.role !== 'admin' && (
            <button onClick={() => navigate('/settings')} className="p-2 rounded-xl" style={{ background: 'var(--color-card)' }}>
              <Settings size={18} color="var(--color-text)" />
            </button>
          )}

          {/* Logout */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            className="p-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            title="Logout"
          >
            <LogOut size={18} color="#ef4444" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
