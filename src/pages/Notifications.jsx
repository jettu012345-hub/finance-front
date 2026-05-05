import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import useNotificationStore from '../store/notificationStore';
import { formatDateTime } from '../utils/helpers';
import { Bell, CheckCheck } from 'lucide-react';

const typeColors = { payment: '#10b981', expense: '#f59e0b', team: '#6366f1', system: '#6b7280' };
const typeIcons = { payment: '💰', expense: '🧾', team: '👥', system: '🔔' };

const Notifications = () => {
  const { notifications, fetchNotifications, markAllRead } = useNotificationStore();

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <Layout>
      <div style={{ padding: '16px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--color-text)' }}>Notifications</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{notifications.filter(n => !n.isRead).length} unread</p>
          </div>
          {notifications.some(n => !n.isRead) && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={64} className="mx-auto mb-4 opacity-20" color="var(--color-text)" />
            <p style={{ color: 'var(--color-muted)' }}>All caught up!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n, i) => (
              <motion.div key={n._id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
                className="glass p-4 rounded-2xl relative overflow-hidden"
                style={{ borderLeft: `3px solid ${typeColors[n.type] || '#6b7280'}`, opacity: n.isRead ? 0.6 : 1 }}>
                {!n.isRead && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: `${typeColors[n.type] || '#6b7280'}15` }}>
                    {typeIcons[n.type] || '🔔'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{n.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{n.message}</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
