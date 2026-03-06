import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';

const PG_BASE_URL =
  import.meta.env.VITE_PARAMGATEWAY_BASE_URL ?? 'http://speedtest.param.network:8450';

export const pgClient: AxiosInstance = axios.create({
  baseURL: PG_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

pgClient.interceptors.request.use((config) => {
  const { paramId } = useAuthStore.getState();
  const { activeWorkspace } = useWorkspaceStore.getState();

  if (paramId) config.headers['X-Gateway-Role'] = paramId;
  if (activeWorkspace) config.headers['X-Workspace'] = activeWorkspace;

  return config;
});

/**
 * URL-encode a pipeline ID.
 * e.g. "pipe:sys:define-sm-v1" → "pipe%3Asys%3Adefine-sm-v1"
 */
export function encodePipelineId(pipelineId: string): string {
  return encodeURIComponent(pipelineId);
}

export default pgClient;
