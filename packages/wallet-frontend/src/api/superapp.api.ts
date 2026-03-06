import apiClient from './client';
import type { InstalledSuperApp } from '@/types/workspace';
import type { SuperAppDefinition } from '@/types/definitions';

// Uses X-Workspace header for all workspace-scoped calls

export async function listInstalledSuperApps(): Promise<InstalledSuperApp[]> {
  const res = await apiClient.get<InstalledSuperApp[]>('/superapp');
  return res.data;
}

export async function getInstalledSuperApp(superAppId: string): Promise<InstalledSuperApp> {
  const res = await apiClient.get<InstalledSuperApp>(`/superapp/${superAppId}`);
  return res.data;
}

export async function installSuperApp(
  data: { superAppDefId: string; orgName?: string; config?: Record<string, unknown> }
): Promise<InstalledSuperApp> {
  const res = await apiClient.post<InstalledSuperApp>('/superapp/install', data);
  return res.data;
}

export async function updateSuperAppStatus(
  superAppId: string,
  status: string
): Promise<InstalledSuperApp> {
  const res = await apiClient.put<InstalledSuperApp>(`/superapp/${superAppId}/status`, { status });
  return res.data;
}

export async function listAvailableSuperApps(): Promise<SuperAppDefinition[]> {
  const res = await apiClient.get<SuperAppDefinition[]>('/definitions/superapps');
  return res.data;
}
