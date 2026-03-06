import { useParams, useNavigate } from 'react-router-dom';
import { useOffchainSM } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Edit, GitBranch } from 'lucide-react';

export default function OffchainSMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sm, isLoading } = useOffchainSM(id!);

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;
  if (!sm) return <div className="p-6 text-muted-foreground">Not found</div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/offchain/sm')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{sm.displayName}</h2>
            <Badge variant="outline">{sm.smType}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{sm.name}</p>
        </div>
        <Button onClick={() => navigate(`/definitions/offchain/sm/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Definition JSON</h3>
        <JsonViewer data={sm} />
      </div>
    </div>
  );
}
