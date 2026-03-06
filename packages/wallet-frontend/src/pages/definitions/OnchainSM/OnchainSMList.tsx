import { useNavigate } from 'react-router-dom';
import { useOnchainSMs } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, GitBranch } from 'lucide-react';

export default function OnchainSMList() {
  const navigate = useNavigate();
  const { data: sms = [], isLoading } = useOnchainSMs();

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Onchain State Machines</h2>
          <p className="text-sm text-muted-foreground">{sms.length} definitions</p>
        </div>
        <Button onClick={() => navigate('/definitions/onchain/sm/new')}>
          <Plus className="mr-2 h-4 w-4" /> New SM
        </Button>
      </div>

      {sms.length === 0 ? (
        <EmptyState
          title="No Onchain SMs"
          description="Deploy your first onchain state machine definition."
          icon={<GitBranch className="h-10 w-10" />}
          action={{ label: 'Create SM', onClick: () => navigate('/definitions/onchain/sm/new') }}
        />
      ) : (
        <div className="grid gap-3">
          {sms.map((sm) => (
            <div
              key={sm._id}
              className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/definitions/onchain/sm/${sm._id}`)}
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{sm.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{sm.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{sm.smType}</Badge>
                <Badge variant="secondary">{Object.keys(sm.states).length} states</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
