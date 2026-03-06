import { useNavigate } from 'react-router-dom';
import { useOffchainSchemas } from '@/hooks/useDefinitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Database } from 'lucide-react';

export default function OffchainSchemaList() {
  const navigate = useNavigate();
  const { data: schemas = [], isLoading } = useOffchainSchemas();

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Offchain Schemas</h2>
          <p className="text-sm text-muted-foreground">{schemas.length} definitions</p>
        </div>
        <Button onClick={() => navigate('/definitions/offchain/schema/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Schema
        </Button>
      </div>

      {schemas.length === 0 ? (
        <EmptyState
          title="No Offchain Schemas"
          icon={<Database className="h-10 w-10" />}
          action={{ label: 'Create Schema', onClick: () => navigate('/definitions/offchain/schema/new') }}
        />
      ) : (
        <div className="grid gap-3">
          {schemas.map((schema) => (
            <div
              key={schema._id}
              className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/50"
              onClick={() => navigate(`/definitions/offchain/schema/${schema._id}`)}
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{schema.displayName}</p>
                  <p className="text-xs text-muted-foreground">{schema.desc}</p>
                </div>
              </div>
              <Badge variant="secondary">v{schema.version}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
