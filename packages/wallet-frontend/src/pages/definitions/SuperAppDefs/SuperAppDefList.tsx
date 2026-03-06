import { useNavigate } from 'react-router-dom';
import { useSuperAppDefs } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Box } from 'lucide-react';

export default function SuperAppDefList() {
  const navigate = useNavigate();
  const { data: defs = [], isLoading } = useSuperAppDefs();

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SuperApp Definitions</h2>
          <p className="text-sm text-muted-foreground">{defs.length} definitions</p>
        </div>
        <Button onClick={() => navigate('/definitions/superapps/new')}>
          <Plus className="mr-2 h-4 w-4" /> New SuperApp
        </Button>
      </div>

      {defs.length === 0 ? (
        <EmptyState
          title="No SuperApp Definitions"
          description="Create your first SuperApp definition."
          icon={<Box className="h-10 w-10" />}
          action={{ label: 'Create SuperApp', onClick: () => navigate('/definitions/superapps/new') }}
        />
      ) : (
        <div className="grid gap-3">
          {defs.map((def) => (
            <div
              key={def._id}
              className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50"
              onClick={() => navigate(`/definitions/superapps/${def._id}`)}
            >
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{def.name}</p>
                  <p className="text-xs text-muted-foreground">{def.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">v{def.version}</Badge>
                <Badge variant={def.isActive ? 'success' : 'secondary'}>
                  {def.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
