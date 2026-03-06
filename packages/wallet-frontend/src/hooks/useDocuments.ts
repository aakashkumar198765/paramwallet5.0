import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDocuments,
  getDocument,
  createDocument,
  transitionDocument,
} from '@/api/documents.api';
import type { DocumentListParams } from '@/types/documents';

// Context (workspace, superAppId, portal) is injected via headers by client.ts interceptor.

export function useDocuments(smId: string, params: DocumentListParams = {}) {
  return useQuery({
    queryKey: ['documents', smId, params],
    queryFn: () => listDocuments({ smId, ...params }),
    enabled: !!smId,
    placeholderData: (prev) => prev,
  });
}

export function useDocument(docId: string) {
  return useQuery({
    queryKey: ['document', docId],
    queryFn: () => getDocument(docId),
    enabled: !!docId,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createDocument(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useTransitionDocument(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      targetState: string;
      targetSubState?: string | null;
      targetMicroState?: string | null;
      payload?: Record<string, unknown>;
    }) => transitionDocument(docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', docId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
