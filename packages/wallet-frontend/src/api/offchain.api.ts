import apiClient from './client';
import type { DocumentListParams, DocumentListResponse } from '@/types/documents';

// ── Query Engine — Offchain endpoints ────────────────────────────────────────
// All use X-Workspace, X-SuperApp-ID, X-Portal headers

export interface OffchainDefinition {
  _id: string;
  name: string;
  linkedSuperApps: string[];
  [key: string]: unknown;
}

export interface OffchainRegistryResponse {
  total: number;
  page: number;
  limit: number;
  records: unknown[];
}

export async function listOffchainDefinitions(): Promise<OffchainDefinition[]> {
  const res = await apiClient.get<OffchainDefinition[]>('/offchain/definitions');
  return res.data;
}

export async function getOffchainDefinition(offchainSmId: string): Promise<{ sm: unknown; schemas: unknown[] }> {
  const res = await apiClient.get<{ sm: unknown; schemas: unknown[] }>(
    `/offchain/definitions/${offchainSmId}`
  );
  return res.data;
}

export async function listOffchainRegistry(
  collectionName: string,
  params: DocumentListParams = {}
): Promise<OffchainRegistryResponse> {
  const res = await apiClient.get<OffchainRegistryResponse>(
    `/offchain/registry/${collectionName}`,
    { params }
  );
  return res.data;
}

export async function getOffchainRegistryItem(
  collectionName: string,
  keyValue: string
): Promise<unknown> {
  const res = await apiClient.get<unknown>(
    `/offchain/registry/${collectionName}/${keyValue}`
  );
  return res.data;
}

export async function getOffchainConfig(collectionName: string): Promise<unknown> {
  const res = await apiClient.get<unknown>(`/offchain/config/${collectionName}`);
  return res.data;
}
