import { useQuery } from '@tanstack/react-query';
import { getDocumentTxnHistory } from '@/api/documents.api';
import type { TxnHistory } from '@/types/documents';

export function useChain(docId: string) {
  return useQuery<TxnHistory[]>({
    queryKey: ['chain', docId],
    queryFn: () => getDocumentTxnHistory(docId),
    enabled: !!docId,
  });
}
