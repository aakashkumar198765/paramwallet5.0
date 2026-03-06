import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDocumentTxnHistory } from '@/api/documents.api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export default function DocumentChain() {
  const { workspace, superAppId, docId } = useParams<{
    workspace: string;
    superAppId: string;
    docId: string;
  }>();

  const { data: chain, isLoading } = useQuery({
    queryKey: ['documentChain', docId],
    queryFn: () => getDocumentTxnHistory(docId!),
    enabled: !!docId,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!chain || !chain.length) return <div className="p-6">No transaction history</div>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Transaction History</h2>

      <div className="space-y-3">
        {chain.map((txn: any, idx: number) => (
          <Card key={txn._id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {idx + 1}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{txn.changeType || 'STATE_CHANGE'}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{txn.stateTo}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Timestamp:</span> {formatDate(txn.timestamp)}
                  </div>
                  <div>
                    <span className="font-medium">Actor:</span> {txn.actorId?.slice(0, 10)}...
                  </div>
                  <div>
                    <span className="font-medium">Sequence:</span> {txn.sequence}
                  </div>
                  {txn.rootTxn && (
                    <div>
                      <span className="font-medium">Root Txn:</span> {txn.rootTxn.slice(0, 10)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
