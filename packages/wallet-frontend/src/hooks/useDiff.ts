import { useQuery } from '@tanstack/react-query';
import { getDocumentDiff } from '@/api/documents.api';
import type { DiffResponse } from '@/types/documents';

export function useDiff(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  return useQuery<DiffResponse>({
    queryKey: ['diff', subdomain, superAppId, smId, docId],
    queryFn: () => getDocumentDiff(subdomain, superAppId, smId, docId),
    enabled: !!subdomain && !!superAppId && !!smId && !!docId,
    staleTime: 30_000,
  });
}
