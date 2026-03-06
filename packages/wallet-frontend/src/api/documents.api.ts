import { apiClient } from './client';
import type { SmDocument, DocumentListResponse, DocumentListParams, ActionResult, DiffResult, TxnHistoryEntry } from '@/types/documents';

export async function getDocuments(params: DocumentListParams): Promise<DocumentListResponse> {
  const res = await apiClient.get<DocumentListResponse>('/documents', { params });
  return res.data;
}

export async function getDocument(docId: string, smId?: string): Promise<SmDocument> {
  const res = await apiClient.get<SmDocument>(`/documents/${docId}`, { params: smId ? { smId } : {} });
  return res.data;
}

export async function getDocumentActions(docId: string, smId?: string): Promise<ActionResult> {
  const res = await apiClient.get<ActionResult>(`/documents/${docId}/actions`, { params: smId ? { smId } : {} });
  return res.data;
}

export async function getDocumentDiff(docId: string): Promise<DiffResult> {
  const res = await apiClient.get<DiffResult>(`/documents/${docId}/diff`);
  return res.data;
}

export async function getDocumentChain(docId: string): Promise<{ docId: string; chain: TxnHistoryEntry[] }> {
  const res = await apiClient.get<{ docId: string; chain: TxnHistoryEntry[] }>(`/documents/${docId}/chain`);
  return res.data;
}
