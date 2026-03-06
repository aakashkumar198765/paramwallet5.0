import apiClient from './client';
import type { InstalledSuperApp } from '@/types/workspace';
import type { SuperAppDefinition } from '@/types/definitions';

export async function listInstalledSuperApps(subdomain: string): Promise<InstalledSuperApp[]> {
  const res = await apiClient.get<InstalledSuperApp[]>(`/workspaces/${subdomain}/superapps`);
  return res.data;
}

export async function getInstalledSuperApp(subdomain: string, superAppId: string): Promise<InstalledSuperApp> {
  const res = await apiClient.get<InstalledSuperApp>(`/workspaces/${subdomain}/superapps/${superAppId}`);
  return res.data;
}

export async function installSuperApp(
  subdomain: string,
  data: { superAppDefId: string; config?: Record<string, unknown> }
): Promise<InstalledSuperApp> {
  const res = await apiClient.post<InstalledSuperApp>(`/workspaces/${subdomain}/superapps/install`, data);
  return res.data;
}

export async function uninstallSuperApp(subdomain: string, superAppId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${subdomain}/superapps/${superAppId}`);
}

export async function listAvailableSuperApps(): Promise<SuperAppDefinition[]> {
  const res = await apiClient.get<SuperAppDefinition[]>('/definitions/superapps?isActive=1');
  return res.data;
}

export interface SuperAppKpis {
  totalSuperApps: number;
  totalDocuments: number;
  activeStates: number;
}

export async function getSuperAppKpis(subdomain: string, superAppId: string): Promise<SuperAppKpis> {
  const res = await apiClient.get<SuperAppKpis>(`/workspaces/${subdomain}/superapps/${superAppId}/kpis`);
  return res.data;
}
