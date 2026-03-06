import apiClient from './client';
import type { SmDocument, ActionsResponse, TxnHistory, DiffResponse, DocumentListParams, DocumentListResponse } from '@/types/documents';

export async function listDocuments(
  params: DocumentListParams & { superAppId: string; smId?: string }
): Promise<DocumentListResponse> {
  // Uses X-Workspace and X-SuperApp-ID headers, passes superAppId/smId as query params
  const res = await apiClient.get<DocumentListResponse>('/documents', { params });
  return res.data;
}

export async function getDocument(docId: string): Promise<SmDocument> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.get<SmDocument>(`/documents/${docId}`);
  return res.data;
}

export async function createDocument(
  data: Record<string, unknown>
): Promise<SmDocument> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.post<SmDocument>('/documents', data);
  return res.data;
}

export async function transitionDocument(
  docId: string,
  data: {
    targetState: string;
    targetSubState?: string | null;
    targetMicroState?: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<SmDocument> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.post<SmDocument>(
    `/documents/${docId}/transition`,
    data
  );
  return res.data;
}

export async function getDocumentActions(docId: string): Promise<ActionsResponse> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.get<ActionsResponse>(`/documents/${docId}/actions`);
  return res.data;
}

export async function getDocumentTxnHistory(docId: string): Promise<TxnHistory[]> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.get<TxnHistory[]>(`/documents/${docId}/chain`);
  return res.data;
}

export async function getDocumentDiff(docId: string): Promise<DiffResponse> {
  // Uses X-Workspace and X-SuperApp-ID headers
  const res = await apiClient.get<DiffResponse>(`/documents/${docId}/diff`);
  return res.data;
}
