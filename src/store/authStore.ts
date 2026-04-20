import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user) => set({ user }),

      clearUser: () => set({ user: null }),

      isAuthenticated: () => get().user !== null,

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        return user.permissions.some((p) => p.name === permission);
      },
    }),
    {
      name: 'inout-auth',
    }
  )
);
