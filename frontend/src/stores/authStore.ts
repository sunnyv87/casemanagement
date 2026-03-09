import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'analyst' | 'manager' | 'admin';
  customerIds: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, accessToken, refreshToken } = response.data;
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;
        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken: newToken, refreshToken: newRefresh } = response.data;
          set({ accessToken: newToken, refreshToken: newRefresh });
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } catch {
          get().logout();
        }
      },
    }),
    { name: 'auth-storage' }
  )
);
