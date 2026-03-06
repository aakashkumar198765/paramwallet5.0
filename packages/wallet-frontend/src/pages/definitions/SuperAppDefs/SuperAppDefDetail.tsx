import { useParams, useNavigate } from 'react-router-dom';
import { useSuperAppDef } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Edit, Box } from 'lucide-react';

export default function SuperAppDefDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: def, isLoading } = useSuperAppDef(id!);

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;
  if (!def) return <div className="p-6 text-muted-foreground">Not found</div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/superapps')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{def.name}</h2>
            <Badge variant="secondary">v{def.version}</Badge>
            <Badge variant={def.isActive ? 'success' : 'secondary'}>{def.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{def.desc}</p>
        </div>
        <Button onClick={() => navigate(`/definitions/superapps/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Roles</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {def.roles.map((r) => <Badge key={r.name} variant="outline">{r.name}</Badge>)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Linked SMs</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {def.linkedSMs.map((sm) => <Badge key={sm} variant="secondary">{sm}</Badge>)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Definition JSON</h3>
        <JsonViewer data={def} />
      </div>
    </div>
  );
}
