import { apiClient } from './client';
import type { Workspace, Plant, InstalledSuperApp, Organization, AppUser } from '@/types/workspace';

// ── Workspace ─────────────────────────────────────────────────────────────────

export async function createWorkspace(body: {
  subdomain: string;
  workspaceName: string;
  exchangeParamId: string;
}): Promise<Workspace> {
  const res = await apiClient.post<Workspace>('/workspace/create', body);
  return res.data;
}

export async function listWorkspaces(): Promise<{ workspaces: Workspace[] }> {
  const res = await apiClient.get<{ workspaces: Workspace[] }>('/workspace/list');
  return res.data;
}

export async function getWorkspace(): Promise<Workspace> {
  const res = await apiClient.get<Workspace>('/workspace');
  return res.data;
}

export async function updateWorkspace(body: {
  workspaceName?: string;
  status?: string;
}): Promise<Workspace> {
  const res = await apiClient.put<Workspace>('/workspace', body);
  return res.data;
}

// ── Plants ────────────────────────────────────────────────────────────────────

export async function listPlants(): Promise<{ plants: Plant[] }> {
  const res = await apiClient.get<{ plants: Plant[] }>('/workspace/plants');
  return res.data;
}

export async function createPlant(body: {
  code: string;
  name: string;
  paramId?: string;
  location?: Record<string, string>;
}): Promise<Plant> {
  const res = await apiClient.post<Plant>('/workspace/plants', body);
  return res.data;
}

export async function updatePlant(
  code: string,
  body: { name?: string; location?: Record<string, string>; isActive?: boolean },
): Promise<Plant> {
  const res = await apiClient.put<Plant>(`/workspace/plants/${code}`, body);
  return res.data;
}

export async function deletePlant(code: string): Promise<void> {
  await apiClient.delete(`/workspace/plants/${code}`);
}

// ── SuperApps ─────────────────────────────────────────────────────────────────

export async function listInstalledSuperApps(): Promise<{ superapps: InstalledSuperApp[] }> {
  const res = await apiClient.get<{ superapps: InstalledSuperApp[] }>('/superapp');
  return res.data;
}

export async function getInstalledSuperApp(superAppId: string): Promise<InstalledSuperApp & { orgBindings: Record<string, Organization[]> }> {
  const res = await apiClient.get<InstalledSuperApp & { orgBindings: Record<string, Organization[]> }>(`/superapp/${superAppId}`);
  return res.data;
}

export async function installSuperApp(superAppId: string): Promise<InstalledSuperApp> {
  const res = await apiClient.post<InstalledSuperApp>('/superapp/install', { superAppId });
  return res.data;
}

export async function updateSuperAppStatus(superAppId: string, status: string): Promise<InstalledSuperApp> {
  const res = await apiClient.put<InstalledSuperApp>(`/superapp/${superAppId}/status`, { status });
  return res.data;
}

// ── Organizations ─────────────────────────────────────────────────────────────

export async function listOrgs(superAppId: string): Promise<{ organizations: Organization[] }> {
  const res = await apiClient.get<{ organizations: Organization[] }>(`/superapp/${superAppId}/orgs`);
  return res.data;
}

export async function onboardPartner(
  superAppId: string,
  body: {
    role: string;
    org: Organization['org'];
    orgAdmin?: string;
    plants?: Array<{ code: string; name: string }>;
  },
): Promise<Organization> {
  const res = await apiClient.post<Organization>(`/superapp/${superAppId}/partners/onboard`, body);
  return res.data;
}

export async function updateOrgStatus(
  superAppId: string,
  role: string,
  paramId: string,
  status: string,
): Promise<Organization> {
  const res = await apiClient.put<Organization>(`/superapp/${superAppId}/orgs/${role}/${paramId}/status`, { status });
  return res.data;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(superAppId: string, role: string): Promise<{ users: AppUser[] }> {
  const res = await apiClient.get<{ users: AppUser[] }>(`/superapp/${superAppId}/roles/${role}/users`);
  return res.data;
}

export async function addUser(
  superAppId: string,
  role: string,
  body: {
    email: string;
    name: string;
    orgParamId: string;
    partnerId?: string | null;
    plantTeams: { plant: string; teams: string[] }[];
    isOrgAdmin?: boolean;
  },
): Promise<{ added: number; errors: unknown[] }> {
  const res = await apiClient.post<{ added: number; errors: unknown[] }>(`/superapp/${superAppId}/roles/${role}/users`, { users: [body] });
  return res.data;
}

export async function updateUser(
  superAppId: string,
  userId: string,
  body: Partial<AppUser>,
): Promise<AppUser> {
  const res = await apiClient.put<AppUser>(`/superapp/${superAppId}/users/${userId}`, body);
  return res.data;
}

export async function suspendUser(superAppId: string, userId: string): Promise<void> {
  await apiClient.delete(`/superapp/${superAppId}/users/${userId}`);
}
