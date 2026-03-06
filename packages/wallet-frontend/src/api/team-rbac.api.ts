import apiClient from './client';
import type { TeamRbacMatrix } from '@/types/definitions';

export async function listRbacMatrices(subdomain: string, superAppId: string): Promise<TeamRbacMatrix[]> {
  const res = await apiClient.get<TeamRbacMatrix[]>(
    `/workspaces/${subdomain}/superapps/${superAppId}/rbac`
  );
  return res.data;
}

export async function getRbacMatrix(
  subdomain: string,
  superAppId: string,
  matrixId: string
): Promise<TeamRbacMatrix> {
  const res = await apiClient.get<TeamRbacMatrix>(
    `/workspaces/${subdomain}/superapps/${superAppId}/rbac/${matrixId}`
  );
  return res.data;
}

export async function createRbacMatrix(
  subdomain: string,
  superAppId: string,
  data: Omit<TeamRbacMatrix, '_id'>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.post<TeamRbacMatrix>(
    `/workspaces/${subdomain}/superapps/${superAppId}/rbac`,
    data
  );
  return res.data;
}

export async function updateRbacMatrix(
  subdomain: string,
  superAppId: string,
  matrixId: string,
  data: Partial<TeamRbacMatrix>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.put<TeamRbacMatrix>(
    `/workspaces/${subdomain}/superapps/${superAppId}/rbac/${matrixId}`,
    data
  );
  return res.data;
}

// Definitions-level RBAC (for SuperApp definitions)
export async function listDefinitionRbacMatrices(superAppDefId: string): Promise<TeamRbacMatrix[]> {
  const res = await apiClient.get<TeamRbacMatrix[]>(`/definitions/superapps/${superAppDefId}/rbac`);
  return res.data;
}

export async function getDefinitionRbacMatrix(superAppDefId: string, matrixId: string): Promise<TeamRbacMatrix> {
  const res = await apiClient.get<TeamRbacMatrix>(`/definitions/superapps/${superAppDefId}/rbac/${matrixId}`);
  return res.data;
}

export async function createDefinitionRbacMatrix(
  superAppDefId: string,
  data: Omit<TeamRbacMatrix, '_id'>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.post<TeamRbacMatrix>(`/definitions/superapps/${superAppDefId}/rbac`, data);
  return res.data;
}

export async function updateDefinitionRbacMatrix(
  superAppDefId: string,
  matrixId: string,
  data: Partial<TeamRbacMatrix>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.put<TeamRbacMatrix>(
    `/definitions/superapps/${superAppDefId}/rbac/${matrixId}`,
    data
  );
  return res.data;
}
