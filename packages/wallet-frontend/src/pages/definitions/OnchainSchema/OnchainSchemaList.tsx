import { useNavigate } from 'react-router-dom';
import { useOnchainSchemas } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Database } from 'lucide-react';

export default function OnchainSchemaList() {
  const navigate = useNavigate();
  const { data: schemas = [], isLoading } = useOnchainSchemas();

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Onchain Schemas</h2>
          <p className="text-sm text-muted-foreground">{schemas.length} definitions</p>
        </div>
        <Button onClick={() => navigate('/definitions/onchain/schema/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Schema
        </Button>
      </div>

      {schemas.length === 0 ? (
        <EmptyState
          title="No Onchain Schemas"
          description="Create your first onchain schema definition."
          icon={<Database className="h-10 w-10" />}
          action={{ label: 'Create Schema', onClick: () => navigate('/definitions/onchain/schema/new') }}
        />
      ) : (
        <div className="grid gap-3">
          {schemas.map((schema) => (
            <div
              key={schema._id}
              className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/definitions/onchain/schema/${schema._id}`)}
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{schema.displayName}</p>
                  <p className="text-xs text-muted-foreground">{schema.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">v{schema.version}</Badge>
                <Badge variant="outline">{Object.keys(schema.properties).length} groups</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
