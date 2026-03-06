import apiClient from './client';
import type { SmDocument, DocumentListParams, DocumentListResponse } from '@/types/documents';

export async function listOffchainDocuments(
  subdomain: string,
  superAppId: string,
  smId: string,
  params: DocumentListParams = {}
): Promise<DocumentListResponse> {
  const res = await apiClient.get<DocumentListResponse>(
    `/workspaces/${subdomain}/superapps/${superAppId}/offchain/${smId}/documents`,
    { params }
  );
  return res.data;
}

export async function getOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
): Promise<SmDocument> {
  const res = await apiClient.get<SmDocument>(
    `/workspaces/${subdomain}/superapps/${superAppId}/offchain/${smId}/documents/${docId}`
  );
  return res.data;
}

export async function createOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  data: Record<string, unknown>
): Promise<SmDocument> {
  const res = await apiClient.post<SmDocument>(
    `/workspaces/${subdomain}/superapps/${superAppId}/offchain/${smId}/documents`,
    data
  );
  return res.data;
}

export async function updateOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string,
  data: Record<string, unknown>
): Promise<SmDocument> {
  const res = await apiClient.put<SmDocument>(
    `/workspaces/${subdomain}/superapps/${superAppId}/offchain/${smId}/documents/${docId}`,
    data
  );
  return res.data;
}

// Offchain definitions (master data schemas)
export async function getOffchainDefinitions(): Promise<any[]> {
  const res = await apiClient.get<any[]>('/platform/offchain-definitions');
  return res.data;
}

// Offchain registry (master data records)
export async function getOffchainRegistry(collectionName: string): Promise<any[]> {
  const res = await apiClient.get<any[]>(`/platform/offchain-registry/${collectionName}`);
  return res.data;
}
