import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listDefinitionRbacMatrices } from '@/api/team-rbac.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Shield } from 'lucide-react';
import { useSuperAppDefs } from '@/hooks/useDefinitions';

export default function RbacMatrixList() {
  const navigate = useNavigate();
  const { data: superApps = [] } = useSuperAppDefs();

  // Show all matrices across all superapp defs
  const { data: matrices = [], isLoading } = useQuery({
    queryKey: ['def-rbac-all'],
    queryFn: async () => {
      const all = await Promise.all(
        superApps.map((sa) => listDefinitionRbacMatrices(sa._id).catch(() => []))
      );
      return all.flat();
    },
    enabled: superApps.length > 0,
  });

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Team RBAC Matrices</h2>
          <p className="text-sm text-muted-foreground">{matrices.length} matrices</p>
        </div>
        <Button onClick={() => navigate('/definitions/rbac/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Matrix
        </Button>
      </div>

      {matrices.length === 0 ? (
        <EmptyState
          title="No RBAC Matrices"
          description="Create RBAC matrices to control role-based access."
          icon={<Shield className="h-10 w-10" />}
          action={{ label: 'Create Matrix', onClick: () => navigate('/definitions/rbac/new') }}
        />
      ) : (
        <div className="grid gap-3">
          {matrices.map((matrix) => (
            <div
              key={matrix._id}
              className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50"
              onClick={() => navigate(`/definitions/rbac/${matrix._id}`)}
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{matrix.smName ?? matrix.smId}</p>
                  <p className="text-xs text-muted-foreground">SuperApp: {matrix.superAppId}</p>
                </div>
              </div>
              <Badge variant="secondary">{matrix.permissions.length} permissions</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
