import { apiClient } from './client';
import type {
  SuperAppDefinition,
  OnchainSMDefinition,
  OnchainSchemaDefinition,
  OffchainSMDefinition,
  OffchainSchemaDefinition,
  TeamRbacMatrix,
} from '@/types/definitions';

// ── SuperApp Definitions ──────────────────────────────────────────────────────

export async function listSuperAppDefs(): Promise<{ superapps: SuperAppDefinition[] }> {
  const res = await apiClient.get<{ superapps: SuperAppDefinition[] }>('/definitions/superapps');
  return res.data;
}

export async function getSuperAppDef(id: string): Promise<SuperAppDefinition> {
  const res = await apiClient.get<SuperAppDefinition>(`/definitions/superapps/${id}`);
  return res.data;
}

export async function createSuperAppDef(body: Partial<SuperAppDefinition>): Promise<SuperAppDefinition> {
  const res = await apiClient.post<SuperAppDefinition>('/definitions/superapps', body);
  return res.data;
}

export async function updateSuperAppDef(id: string, body: Partial<SuperAppDefinition>): Promise<SuperAppDefinition> {
  const res = await apiClient.put<SuperAppDefinition>(`/definitions/superapps/${id}`, body);
  return res.data;
}

// ── Onchain SM Definitions ────────────────────────────────────────────────────
// Backend returns { sms: [...] }

export async function listSMs(): Promise<{ sms: OnchainSMDefinition[] }> {
  const res = await apiClient.get<{ sms: OnchainSMDefinition[] }>('/definitions/sm');
  return res.data;
}

export async function getSM(smId: string): Promise<OnchainSMDefinition> {
  const res = await apiClient.get<OnchainSMDefinition>(`/definitions/sm/${smId}`);
  return res.data;
}

export async function getSMStates(smId: string): Promise<{ smId: string; states: Record<string, unknown> }> {
  const res = await apiClient.get<{ smId: string; states: Record<string, unknown> }>(`/definitions/sm/${smId}/states`);
  return res.data;
}

// ── Onchain Schema Definitions ────────────────────────────────────────────────
// Backend returns { schemas: [...] }

export async function listSchemas(): Promise<{ schemas: OnchainSchemaDefinition[] }> {
  const res = await apiClient.get<{ schemas: OnchainSchemaDefinition[] }>('/definitions/schemas');
  return res.data;
}

export async function getSchema(schemaId: string): Promise<OnchainSchemaDefinition> {
  const res = await apiClient.get<OnchainSchemaDefinition>(`/definitions/schemas/${schemaId}`);
  return res.data;
}

// ── Offchain SM Definitions ───────────────────────────────────────────────────
// Backend returns { offchainSms: [...] }

export async function listOffchainSMs(): Promise<{ offchainSms: OffchainSMDefinition[] }> {
  const res = await apiClient.get<{ offchainSms: OffchainSMDefinition[] }>('/definitions/offchain-sm');
  return res.data;
}

export async function getOffchainSM(id: string): Promise<OffchainSMDefinition> {
  const res = await apiClient.get<OffchainSMDefinition>(`/definitions/offchain-sm/${id}`);
  return res.data;
}

// ── Offchain Schema Definitions ───────────────────────────────────────────────

export async function getOffchainSchema(id: string): Promise<OffchainSchemaDefinition> {
  const res = await apiClient.get<OffchainSchemaDefinition>(`/definitions/offchain-schemas/${id}`);
  return res.data;
}

// ── Team RBAC Matrix ──────────────────────────────────────────────────────────

export async function getRbacMatrix(superAppId: string): Promise<{ matrix: TeamRbacMatrix[] }> {
  const res = await apiClient.get<{ matrix: TeamRbacMatrix[] }>(`/definitions/team-rbac-matrix/${superAppId}`);
  return res.data;
}

export async function getRbacMatrixForSM(superAppId: string, smId: string): Promise<TeamRbacMatrix> {
  const res = await apiClient.get<TeamRbacMatrix>(`/definitions/team-rbac-matrix/${superAppId}/${encodeURIComponent(smId)}`);
  return res.data;
}

export async function createRbacMatrix(body: {
  superAppId: string;
  smId: string;
  smName: string;
  permissions: TeamRbacMatrix['permissions'];
}): Promise<TeamRbacMatrix> {
  const res = await apiClient.post<TeamRbacMatrix>('/definitions/team-rbac-matrix', body);
  return res.data;
}

export async function updateRbacMatrix(
  superAppId: string,
  smId: string,
  body: { permissions: TeamRbacMatrix['permissions'] },
): Promise<TeamRbacMatrix> {
  const res = await apiClient.put<TeamRbacMatrix>(
    `/definitions/team-rbac-matrix/${superAppId}/${encodeURIComponent(smId)}`,
    body,
  );
  return res.data;
}
