import { useQuery } from '@tanstack/react-query';
import { getDocumentActions } from '@/api/documents.api';
import type { ActionsResponse } from '@/types/documents';

export function useActions(docId: string) {
  return useQuery<ActionsResponse>({
    queryKey: ['actions', docId],
    queryFn: () => getDocumentActions(docId),
    enabled: !!docId,
    staleTime: 10_000,
  });
}
