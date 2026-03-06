import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listRbacMatrices } from '@/api/team-rbac.api';
import { RbacMatrixGrid } from '@/components/forms/RbacMatrixGrid';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function RbacSettings() {
  const { workspace, superAppId } = useParams<{ workspace: string; superAppId: string }>();

  const { data: matrices, isLoading } = useQuery({
    queryKey: ['teamRbacMatrix', workspace, superAppId],
    queryFn: () => listRbacMatrices(superAppId!),
    enabled: !!superAppId,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!matrices || matrices.length === 0) {
    return <div className="p-6">No RBAC matrices configured</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Team RBAC Settings</h2>
      <p className="text-muted-foreground">
        Manage team permissions for each state machine. Changes apply to this workspace only.
      </p>

      {matrices.map((matrix: any) => (
        <RbacMatrixGrid
          key={matrix._id}
          superAppId={superAppId!}
          smId={matrix.smId}
          initialMatrix={matrix}
        />
      ))}
    </div>
  );
}
