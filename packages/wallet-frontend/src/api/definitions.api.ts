import apiClient from './client';
import type { SuperAppDefinition, SmDefinition, SchemaDefinition } from '@/types/definitions';

// SuperApp definitions
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

// Onchain SM definitions
export async function listOnchainSMs(): Promise<SmDefinition[]> {
  const res = await apiClient.get<SmDefinition[]>('/definitions/onchain/sm');
  return res.data;
}

export async function getOnchainSM(id: string): Promise<SmDefinition> {
  const res = await apiClient.get<SmDefinition>(`/definitions/onchain/sm/${id}`);
  return res.data;
}

export async function createOnchainSM(data: Omit<SmDefinition, '_id'>): Promise<SmDefinition> {
  const res = await apiClient.post<SmDefinition>('/definitions/onchain/sm', data);
  return res.data;
}

export async function updateOnchainSM(id: string, data: Partial<SmDefinition>): Promise<SmDefinition> {
  const res = await apiClient.put<SmDefinition>(`/definitions/onchain/sm/${id}`, data);
  return res.data;
}

// Onchain Schema definitions
export async function listOnchainSchemas(): Promise<SchemaDefinition[]> {
  const res = await apiClient.get<SchemaDefinition[]>('/definitions/onchain/schema');
  return res.data;
}

export async function getOnchainSchema(id: string): Promise<SchemaDefinition> {
  const res = await apiClient.get<SchemaDefinition>(`/definitions/onchain/schema/${id}`);
  return res.data;
}

export async function createOnchainSchema(data: Omit<SchemaDefinition, '_id'>): Promise<SchemaDefinition> {
  const res = await apiClient.post<SchemaDefinition>('/definitions/onchain/schema', data);
  return res.data;
}

export async function updateOnchainSchema(id: string, data: Partial<SchemaDefinition>): Promise<SchemaDefinition> {
  const res = await apiClient.put<SchemaDefinition>(`/definitions/onchain/schema/${id}`, data);
  return res.data;
}

// Offchain SM definitions
export async function listOffchainSMs(): Promise<SmDefinition[]> {
  const res = await apiClient.get<SmDefinition[]>('/definitions/offchain/sm');
  return res.data;
}

export async function getOffchainSM(id: string): Promise<SmDefinition> {
  const res = await apiClient.get<SmDefinition>(`/definitions/offchain/sm/${id}`);
  return res.data;
}

export async function createOffchainSM(data: Omit<SmDefinition, '_id'>): Promise<SmDefinition> {
  const res = await apiClient.post<SmDefinition>('/definitions/offchain/sm', data);
  return res.data;
}

export async function updateOffchainSM(id: string, data: Partial<SmDefinition>): Promise<SmDefinition> {
  const res = await apiClient.put<SmDefinition>(`/definitions/offchain/sm/${id}`, data);
  return res.data;
}

// Offchain Schema definitions
export async function listOffchainSchemas(): Promise<SchemaDefinition[]> {
  const res = await apiClient.get<SchemaDefinition[]>('/definitions/offchain/schema');
  return res.data;
}

export async function getOffchainSchema(id: string): Promise<SchemaDefinition> {
  const res = await apiClient.get<SchemaDefinition>(`/definitions/offchain/schema/${id}`);
  return res.data;
}

export async function createOffchainSchema(data: Omit<SchemaDefinition, '_id'>): Promise<SchemaDefinition> {
  const res = await apiClient.post<SchemaDefinition>('/definitions/offchain/schema', data);
  return res.data;
}

export async function updateOffchainSchema(id: string, data: Partial<SchemaDefinition>): Promise<SchemaDefinition> {
  const res = await apiClient.put<SchemaDefinition>(`/definitions/offchain/schema/${id}`, data);
  return res.data;
}
