import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDocuments,
  getDocument,
  createDocument,
  transitionDocument,
} from '@/api/documents.api';
import type { DocumentListParams } from '@/types/documents';

export function useDocuments(
  subdomain: string,
  superAppId: string,
  smId: string,
  params: DocumentListParams = {}
) {
  return useQuery({
    queryKey: ['documents', subdomain, superAppId, smId, params],
    queryFn: () => listDocuments(subdomain, superAppId, smId, params),
    enabled: !!subdomain && !!superAppId && !!smId,
    placeholderData: (prev) => prev,
  });
}

export function useDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  return useQuery({
    queryKey: ['document', subdomain, superAppId, smId, docId],
    queryFn: () => getDocument(subdomain, superAppId, smId, docId),
    enabled: !!subdomain && !!superAppId && !!smId && !!docId,
  });
}

export function useCreateDocument(subdomain: string, superAppId: string, smId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createDocument(subdomain, superAppId, smId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', subdomain, superAppId, smId] });
    },
  });
}

export function useTransitionDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      targetState: string;
      targetSubState?: string | null;
      targetMicroState?: string | null;
      payload?: Record<string, unknown>;
    }) => transitionDocument(subdomain, superAppId, smId, docId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', subdomain, superAppId, smId, docId] });
      qc.invalidateQueries({ queryKey: ['documents', subdomain, superAppId, smId] });
    },
  });
}
