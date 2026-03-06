import { useParams, useNavigate } from 'react-router-dom';
import { useOnchainSM } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Edit, GitBranch } from 'lucide-react';

export default function OnchainSMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sm, isLoading } = useOnchainSM(id!);

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;
  if (!sm) return <div className="p-6 text-muted-foreground">Not found</div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/onchain/sm')}>
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
        <Button onClick={() => navigate(`/definitions/onchain/sm/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">States</p>
          <p className="text-2xl font-bold">{Object.keys(sm.states).length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Roles</p>
          <p className="text-2xl font-bold">{sm.roles.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Start State</p>
          <p className="text-sm font-semibold">{sm.startAt}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Definition JSON</h3>
        <JsonViewer data={sm} />
      </div>
    </div>
  );
}
