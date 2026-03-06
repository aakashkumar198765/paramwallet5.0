import apiClient from './client';
import type { TeamRbacMatrix } from '@/types/definitions';

// ── Workspace-level RBAC (installed SuperApp) ────────────────────────────────
// Uses X-Workspace header

export async function listRbacMatrices(superAppId: string): Promise<TeamRbacMatrix[]> {
  const res = await apiClient.get<TeamRbacMatrix[]>(
    `/superapp/${superAppId}/team-rbac-matrix`
  );
  return res.data;
}

export async function getRbacMatrix(superAppId: string, smId: string): Promise<TeamRbacMatrix> {
  const res = await apiClient.get<TeamRbacMatrix>(
    `/superapp/${superAppId}/team-rbac-matrix/${smId}`
  );
  return res.data;
}

export async function updateRbacMatrix(
  superAppId: string,
  smId: string,
  data: Partial<TeamRbacMatrix>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.put<TeamRbacMatrix>(
    `/superapp/${superAppId}/team-rbac-matrix/${smId}`,
    data
  );
  return res.data;
}

// ── Definitions-level RBAC (SuperApp definition) ─────────────────────────────

export async function listDefinitionRbacMatrices(superAppId: string): Promise<TeamRbacMatrix[]> {
  const res = await apiClient.get<TeamRbacMatrix[]>(
    `/definitions/team-rbac-matrix/${superAppId}`
  );
  return res.data;
}

export async function getDefinitionRbacMatrix(
  superAppId: string,
  smId: string
): Promise<TeamRbacMatrix> {
  const res = await apiClient.get<TeamRbacMatrix>(
    `/definitions/team-rbac-matrix/${superAppId}/${smId}`
  );
  return res.data;
}

export async function createDefinitionRbacMatrix(
  data: Omit<TeamRbacMatrix, '_id'>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.post<TeamRbacMatrix>('/definitions/team-rbac-matrix', data);
  return res.data;
}

export async function updateDefinitionRbacMatrix(
  superAppId: string,
  smId: string,
  data: Partial<TeamRbacMatrix>
): Promise<TeamRbacMatrix> {
  const res = await apiClient.put<TeamRbacMatrix>(
    `/definitions/team-rbac-matrix/${superAppId}/${smId}`,
    data
  );
  return res.data;
}
