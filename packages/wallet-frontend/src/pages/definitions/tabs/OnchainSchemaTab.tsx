import { useState } from 'react';
import { FileJson, Eye, Upload } from 'lucide-react';
import { useSchemas } from '@/hooks/use-definitions';
import { deployOnchainSchema } from '@/api/paramgateway/stubs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { OnchainSchemaDefinition } from '@/types/definitions';

export function OnchainSchemaTab({ ws }: { ws: string }) {
  const { data: schemas, isLoading } = useSchemas(ws);
  const [viewSchema, setViewSchema] = useState<OnchainSchemaDefinition | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const handleDeploy = async (schema: OnchainSchemaDefinition) => {
    setDeploying(schema._id);
    try {
      await deployOnchainSchema({ schemaId: schema._id, name: schema.name, version: schema.version, properties: schema.properties });
      toast({ title: 'Deploy submitted (stub)', description: `${schema.name} → ParamGateway` });
    } catch {
      toast({ variant: 'destructive', title: 'Deploy failed' });
    } finally {
      setDeploying(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (!schemas?.length) return <EmptyState icon={FileJson} title="No onchain schemas" />;

  return (
    <div className="space-y-2 mt-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Version</TableHead><TableHead>Fields</TableHead>
              <TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schemas.map((schema) => (
              <TableRow key={schema._id}>
                <TableCell className="font-medium">{schema.name}</TableCell>
                <TableCell className="font-mono text-xs">{schema.version}</TableCell>
                <TableCell>{Object.keys(schema.properties).length}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(schema.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewSchema(schema)}>
                      <Eye className="h-3 w-3" />View
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={deploying === schema._id} onClick={() => handleDeploy(schema)}>
                      {deploying === schema._id ? <LoadingSpinner size="sm" /> : <Upload className="h-3 w-3" />}Deploy
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!viewSchema} onOpenChange={(o) => { if (!o) setViewSchema(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{viewSchema?.name} <span className="text-muted-foreground font-normal">v{viewSchema?.version}</span></DialogTitle></DialogHeader>
          {viewSchema && <JsonViewer data={viewSchema} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
