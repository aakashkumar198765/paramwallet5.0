import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  getDocuments,
  getDocument,
  getDocumentActions,
  getDocumentDiff,
  getDocumentChain,
} from '@/api/documents.api';
import type { DocumentListParams } from '@/types/documents';

export const docKeys = {
  list: (ws: string, saId: string, params: DocumentListParams) =>
    ['documents', ws, saId, params] as const,
  detail: (ws: string, saId: string, docId: string) => ['document', ws, saId, docId] as const,
  actions: (ws: string, saId: string, docId: string) =>
    ['documentActions', ws, saId, docId] as const,
  diff: (ws: string, saId: string, docId: string) => ['documentDiff', ws, saId, docId] as const,
  chain: (ws: string, saId: string, docId: string) => ['documentChain', ws, saId, docId] as const,
};

export function useDocuments(ws: string, saId: string, params: DocumentListParams) {
  return useQuery({
    queryKey: docKeys.list(ws, saId, params),
    queryFn: () => getDocuments(params),
    enabled: !!ws && !!saId,
    placeholderData: keepPreviousData,
  });
}

export function useDocument(ws: string, saId: string, docId: string, smId?: string) {
  return useQuery({
    queryKey: docKeys.detail(ws, saId, docId),
    queryFn: () => getDocument(docId, smId),
    enabled: !!docId,
  });
}

export function useDocumentActions(ws: string, saId: string, docId: string) {
  return useQuery({
    queryKey: docKeys.actions(ws, saId, docId),
    queryFn: () => getDocumentActions(docId),
    enabled: !!docId,
  });
}

export function useDocumentDiff(ws: string, saId: string, docId: string) {
  return useQuery({
    queryKey: docKeys.diff(ws, saId, docId),
    queryFn: () => getDocumentDiff(docId),
    enabled: !!docId,
  });
}

export function useDocumentChain(ws: string, saId: string, docId: string) {
  return useQuery({
    queryKey: docKeys.chain(ws, saId, docId),
    queryFn: () => getDocumentChain(docId),
    enabled: !!docId,
  });
}
