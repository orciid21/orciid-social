import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken });
        return data;
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken });
        return data;
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null });
      },

      updateUser: (user) => set({ user }),

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await api.post('/auth/refresh', { refreshToken });
        set({ token: data.accessToken, refreshToken: data.refreshToken });
        return data.accessToken;
      },
    }),
    {
      name: 'orciid-auth',
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
