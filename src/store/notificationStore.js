import { create } from 'zustand';
import { notificationService } from '../services';

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await notificationService.getAll();
      set({ notifications: res.data.notifications });
    } catch {}
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationService.getUnreadCount();
      set({ unreadCount: res.data.count });
    } catch {}
  },

  markAllRead: async () => {
    try {
      await notificationService.markRead();
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
    } catch {}
  },

  addNotification: (notif) => set((s) => ({ notifications: [notif, ...s.notifications], unreadCount: s.unreadCount + 1 })),
}));

export default useNotificationStore;
