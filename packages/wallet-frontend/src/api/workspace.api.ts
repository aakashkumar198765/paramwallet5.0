import apiClient from './client';
import type { Workspace, Plant } from '@/types/workspace';

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await apiClient.get<Workspace[]>('/workspace/list');
  return res.data;
}

export async function getWorkspace(): Promise<Workspace> {
  // Uses X-Workspace header, no subdomain param needed
  const res = await apiClient.get<Workspace>('/workspace');
  return res.data;
}

export async function createWorkspace(data: {
  subdomain: string;
  workspaceName: string;
  exchangeParamId: string;
}): Promise<Workspace> {
  const res = await apiClient.post<Workspace>('/workspace/create', data);
  return res.data;
}

export async function listPlants(): Promise<Plant[]> {
  // Uses X-Workspace header
  const res = await apiClient.get<Plant[]>('/workspace/plants');
  return res.data;
}

export async function createPlant(
  data: Omit<Plant, '_id' | 'createdAt'>
): Promise<Plant> {
  // Uses X-Workspace header
  const res = await apiClient.post<Plant>('/workspace/plants', data);
  return res.data;
}

export async function updatePlant(
  plantCode: string,
  data: Partial<Plant>
): Promise<Plant> {
  // Uses X-Workspace header, plantCode in URL
  const res = await apiClient.put<Plant>(`/workspace/plants/${plantCode}`, data);
  return res.data;
}
