import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listOffchainDocuments,
  getOffchainDocument,
  createOffchainDocument,
  updateOffchainDocument,
} from '@/api/offchain.api';
import type { DocumentListParams } from '@/types/documents';

export function useOffchainDocuments(
  subdomain: string,
  superAppId: string,
  smId: string,
  params: DocumentListParams = {}
) {
  return useQuery({
    queryKey: ['offchain-documents', subdomain, superAppId, smId, params],
    queryFn: () => listOffchainDocuments(subdomain, superAppId, smId, params),
    enabled: !!subdomain && !!superAppId && !!smId,
    placeholderData: (prev) => prev,
  });
}

export function useOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  return useQuery({
    queryKey: ['offchain-document', subdomain, superAppId, smId, docId],
    queryFn: () => getOffchainDocument(subdomain, superAppId, smId, docId),
    enabled: !!subdomain && !!superAppId && !!smId && !!docId,
  });
}

export function useCreateOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createOffchainDocument(subdomain, superAppId, smId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offchain-documents', subdomain, superAppId, smId] });
    },
  });
}

export function useUpdateOffchainDocument(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateOffchainDocument(subdomain, superAppId, smId, docId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['offchain-document', subdomain, superAppId, smId, docId],
      });
    },
  });
}
