import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create()(persist((set) => ({
    token: null,
    refreshToken: null,
    paramId: null,
    userId: null,
    email: null,
    name: null,
    isAuthenticated: false,
    setAuth: (data) => set({
        token: data.token,
        refreshToken: data.refreshToken,
        paramId: data.paramId,
        userId: data.userId,
        email: data.email,
        name: data.name ?? null,
        isAuthenticated: true,
    }),
    updateUser: (user) => set((state) => ({
        email: user.email ?? state.email,
        name: user.name ?? state.name,
        paramId: user.paramId ?? state.paramId,
    })),
    clearAuth: () => set({
        token: null,
        refreshToken: null,
        paramId: null,
        userId: null,
        email: null,
        name: null,
        isAuthenticated: false,
    }),
}), {
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
}));
