import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// In-flight refresh promise dedup
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const { refreshToken, setAuth, clearAuth } = useAuthStore.getState();
  if (!refreshToken) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('No refresh token');
  }
  try {
    const res = await axios.post<{
      token: string;
      refreshToken: string;
      user: { userId: string; email: string; paramId: string };
    }>(`${BASE_URL}/auth/refresh`, { refreshToken });
    setAuth({
      token: res.data.token,
      refreshToken: res.data.refreshToken,
      paramId: res.data.user.paramId,
      userId: res.data.user.userId,
      email: res.data.user.email,
    });
    return res.data.token;
  } catch {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Refresh failed');
  }
}

// Request interceptor: inject auth headers
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token, paramId } = useAuthStore.getState();
  const { activeWorkspace } = useWorkspaceStore.getState();
  const { activeSuperApp } = useSuperAppStore.getState();

  const { activePortal } = useSuperAppStore.getState();

  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (paramId) config.headers['X-Param-ID'] = paramId;
  if (activeWorkspace) config.headers['X-Workspace'] = activeWorkspace;
  if (activeSuperApp) config.headers['X-SuperApp-ID'] = activeSuperApp;
  if (activePortal) config.headers['X-Portal'] = activePortal;

  return config;
});

// Response interceptor: handle 401 with refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
