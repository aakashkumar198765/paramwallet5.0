import { apiClient } from './client';
import type { OffchainSMDefinition } from '@/types/definitions';

export async function listOffchainDefinitions(): Promise<{ definitions: OffchainSMDefinition[] }> {
  const res = await apiClient.get<{ definitions: OffchainSMDefinition[] }>('/offchain/definitions');
  return res.data;
}

export async function getOffchainDefinition(id: string): Promise<OffchainSMDefinition> {
  const res = await apiClient.get<OffchainSMDefinition>(`/offchain/definitions/${id}`);
  return res.data;
}

export async function getRegistryCollection(collectionName: string): Promise<{ collection: string; records: unknown[] }> {
  const res = await apiClient.get<{ collection: string; records: unknown[] }>(`/offchain/registry/${collectionName}`);
  return res.data;
}

export async function getRegistryRecord(collectionName: string, keyValue: string): Promise<unknown> {
  const res = await apiClient.get<unknown>(`/offchain/registry/${collectionName}/${keyValue}`);
  return res.data;
}

export async function getConfigCollection(collectionName: string): Promise<unknown> {
  const res = await apiClient.get<unknown>(`/offchain/config/${collectionName}`);
  return res.data;
}
