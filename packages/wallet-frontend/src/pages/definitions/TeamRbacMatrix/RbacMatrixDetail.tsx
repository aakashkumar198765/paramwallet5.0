import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDefinitionRbacMatrix } from '@/api/team-rbac.api';
import { Button } from '@/components/ui/button';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Edit, Shield } from 'lucide-react';

export default function RbacMatrixDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['def-rbac', id],
    queryFn: () => getDefinitionRbacMatrix('', id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;
  if (!matrix) return <div className="p-6 text-muted-foreground">Not found</div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/rbac')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{matrix.smName ?? matrix.smId}</h2>
        </div>
        <Button onClick={() => navigate(`/definitions/rbac/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">RBAC Matrix JSON</h3>
        <JsonViewer data={matrix} />
      </div>
    </div>
  );
}
