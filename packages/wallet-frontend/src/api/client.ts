import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Track in-flight refresh to deduplicate concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, paramId } = useAuthStore.getState();
  const { activeWorkspace } = useWorkspaceStore.getState();
  const { activeSuperApp } = useSuperAppStore.getState();

  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (paramId) config.headers['X-Param-ID'] = paramId;
  if (activeWorkspace) config.headers['X-Workspace'] = activeWorkspace;
  if (activeSuperApp) config.headers['X-SuperApp-ID'] = activeSuperApp._id;

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, paramId, clearAuth, setAuth, email, userId, name } = useAuthStore.getState();

      if (!refreshToken || !paramId) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = apiClient
          .post<{ token: string; refreshToken: string; expiresAt: number }>(
            '/auth/refresh',
            { refreshToken, paramId },
          )
          .then((res) => {
            setAuth({
              token: res.data.token,
              refreshToken: res.data.refreshToken,
              paramId: paramId!,
              userId: userId!,
              email: email!,
              name: name ?? undefined,
            });
            return res.data.token;
          })
          .catch(() => {
            clearAuth();
            window.location.href = '/login';
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
