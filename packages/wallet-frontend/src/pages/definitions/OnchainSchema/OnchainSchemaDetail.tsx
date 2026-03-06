import { useParams, useNavigate } from 'react-router-dom';
import { useOnchainSchema } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Edit, Database } from 'lucide-react';

export default function OnchainSchemaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: schema, isLoading } = useOnchainSchema(id!);

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;
  if (!schema) return <div className="p-6 text-muted-foreground">Not found</div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/onchain/schema')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{schema.displayName}</h2>
            <Badge variant="secondary">v{schema.version}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{schema.desc}</p>
        </div>
        <Button onClick={() => navigate(`/definitions/onchain/schema/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Schema JSON</h3>
        <JsonViewer data={schema} />
      </div>
    </div>
  );
}
