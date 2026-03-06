import { useQuery } from '@tanstack/react-query';
import { getDocumentDiff } from '@/api/documents.api';
import type { DiffResponse } from '@/types/documents';

export function useDiff(docId: string) {
  return useQuery<DiffResponse>({
    queryKey: ['diff', docId],
    queryFn: () => getDocumentDiff(docId),
    enabled: !!docId,
    staleTime: 30_000,
  });
}
