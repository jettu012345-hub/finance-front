import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      login: async (mobile, otp) => {
        set({ loading: true });
        try {
          const res = await authService.verifyOTP(mobile, otp);
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isAuthenticated: true, loading: false });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          const data = err.response?.data || {};
          return {
            success: false,
            message: data.message || 'Login failed',
            invalidated: data.invalidated || false,
            locked: err.response?.status === 403,
          };
        }
      },

      register: async (data) => {
        set({ loading: true });
        try {
          const res = await authService.register(data);
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isAuthenticated: true, loading: false });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          const d = err.response?.data || {};
          return {
            success: false,
            message: d.message || 'Register failed',
            invalidated: d.invalidated || false,
            locked: err.response?.status === 403,
          };
        }
      },

      fetchMe: async () => {
        try {
          const res = await authService.getMe();
          set({ user: res.data.user });
        } catch (err) {
          get().logout();
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);

export default useAuthStore;
