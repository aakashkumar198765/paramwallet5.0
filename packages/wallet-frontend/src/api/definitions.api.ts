import apiClient from './client';
import type { SuperAppDefinition, SmDefinition, SchemaDefinition } from '@/types/definitions';

// ── SuperApp definitions ─────────────────────────────────────────────────────

export async function listSuperAppDefs(): Promise<SuperAppDefinition[]> {
  const res = await apiClient.get<SuperAppDefinition[]>('/definitions/superapps');
  return res.data;
}

export async function getSuperAppDef(id: string): Promise<SuperAppDefinition> {
  const res = await apiClient.get<SuperAppDefinition>(`/definitions/superapps/${id}`);
  return res.data;
}

export async function createSuperAppDef(data: Omit<SuperAppDefinition, '_id'>): Promise<SuperAppDefinition> {
  const res = await apiClient.post<SuperAppDefinition>('/definitions/superapps', data);
  return res.data;
}

export async function updateSuperAppDef(id: string, data: Partial<SuperAppDefinition>): Promise<SuperAppDefinition> {
  const res = await apiClient.put<SuperAppDefinition>(`/definitions/superapps/${id}`, data);
  return res.data;
}

// ── Onchain SM definitions ───────────────────────────────────────────────────

export async function listOnchainSMs(): Promise<SmDefinition[]> {
  const res = await apiClient.get<SmDefinition[]>('/definitions/sm');
  return res.data;
}

export async function getOnchainSM(smId: string): Promise<SmDefinition> {
  const res = await apiClient.get<SmDefinition>(`/definitions/sm/${smId}`);
  return res.data;
}

export async function getOnchainSMStates(smId: string): Promise<SmDefinition['states']> {
  const res = await apiClient.get<SmDefinition['states']>(`/definitions/sm/${smId}/states`);
  return res.data;
}

// ── Onchain Schema definitions ───────────────────────────────────────────────

export async function listOnchainSchemas(): Promise<SchemaDefinition[]> {
  const res = await apiClient.get<SchemaDefinition[]>('/definitions/schemas');
  return res.data;
}

export async function getOnchainSchema(schemaId: string): Promise<SchemaDefinition> {
  const res = await apiClient.get<SchemaDefinition>(`/definitions/schemas/${schemaId}`);
  return res.data;
}

// ── Offchain SM definitions ──────────────────────────────────────────────────

export async function listOffchainSMs(): Promise<SmDefinition[]> {
  const res = await apiClient.get<SmDefinition[]>('/definitions/offchain-sm');
  return res.data;
}

export async function getOffchainSM(id: string): Promise<SmDefinition> {
  const res = await apiClient.get<SmDefinition>(`/definitions/offchain-sm/${id}`);
  return res.data;
}

// ── Offchain Schema definitions ──────────────────────────────────────────────

export async function getOffchainSchema(id: string): Promise<SchemaDefinition> {
  const res = await apiClient.get<SchemaDefinition>(`/definitions/offchain-schemas/${id}`);
  return res.data;
}
