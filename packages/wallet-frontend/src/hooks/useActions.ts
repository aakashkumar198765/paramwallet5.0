import { useQuery } from '@tanstack/react-query';
import { getDocumentActions } from '@/api/documents.api';
import type { ActionsResponse } from '@/types/documents';

export function useActions(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  return useQuery<ActionsResponse>({
    queryKey: ['actions', subdomain, superAppId, smId, docId],
    queryFn: () => getDocumentActions(subdomain, superAppId, smId, docId),
    enabled: !!subdomain && !!superAppId && !!smId && !!docId,
    staleTime: 10_000,
  });
}
