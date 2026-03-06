import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  paramId: string | null;
  userId: string | null;
  email: string | null;
  name: string | null;
  isAuthenticated: boolean;
  setAuth: (data: {
    token: string;
    refreshToken: string;
    paramId: string;
    userId: string;
    email: string;
    name?: string;
  }) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      paramId: null,
      userId: null,
      email: null,
      name: null,
      isAuthenticated: false,

      setAuth: (data) =>
        set({
          token: data.token,
          refreshToken: data.refreshToken,
          paramId: data.paramId,
          userId: data.userId,
          email: data.email,
          name: data.name ?? null,
          isAuthenticated: true,
        }),

      updateUser: (user) =>
        set((state) => ({
          email: user.email ?? state.email,
          name: user.name ?? state.name,
          paramId: user.paramId ?? state.paramId,
        })),

      clearAuth: () =>
        set({
          token: null,
          refreshToken: null,
          paramId: null,
          userId: null,
          email: null,
          name: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'param-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        paramId: state.paramId,
        userId: state.userId,
        email: state.email,
        name: state.name,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
