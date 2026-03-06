import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  paramId: string | null;
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  setAuth: (data: Omit<AuthState, 'setAuth' | 'clearAuth' | 'isAuthenticated'>) => void;
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
      isAuthenticated: false,
      setAuth: (data) => set({ ...data, isAuthenticated: true }),
      clearAuth: () =>
        set({
          token: null,
          refreshToken: null,
          paramId: null,
          userId: null,
          email: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'param-auth' }
  )
);
