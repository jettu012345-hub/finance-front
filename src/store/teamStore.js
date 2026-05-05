import { create } from 'zustand';
import { teamService } from '../services';

const useTeamStore = create((set, get) => ({
  team: null,
  loading: false,

  fetchTeam: async () => {
    set({ loading: true });
    try {
      const res = await teamService.getMyTeam();
      set({ team: res.data.team, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setTeam: (team) => set({ team }),

  updateBalance: (balance) => set((s) => ({ team: s.team ? { ...s.team, balance } : s.team })),
}));

export default useTeamStore;
