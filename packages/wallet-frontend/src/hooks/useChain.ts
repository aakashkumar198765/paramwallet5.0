import { useQuery } from '@tanstack/react-query';
import { getDocumentTxnHistory } from '@/api/documents.api';
import type { TxnHistory } from '@/types/documents';

export function useChain(
  subdomain: string,
  superAppId: string,
  smId: string,
  docId: string
) {
  return useQuery<TxnHistory[]>({
    queryKey: ['chain', subdomain, superAppId, smId, docId],
    queryFn: () => getDocumentTxnHistory(subdomain, superAppId, smId, docId),
    enabled: !!subdomain && !!superAppId && !!smId && !!docId,
  });
}
