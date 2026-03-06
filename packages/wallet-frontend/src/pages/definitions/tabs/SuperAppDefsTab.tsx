import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Eye } from 'lucide-react';
import { useSuperAppDefs, useCreateSuperAppDef } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { SuperAppDefinition } from '@/types/definitions';

const defSchema = z.object({
  name: z.string().min(2, 'Name required'),
  desc: z.string().min(2, 'Description required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use semver e.g. 1.0.0'),
  sponsor: z.string().min(1, 'Sponsor Param ID required'),
});
type DefForm = z.infer<typeof defSchema>;

export function SuperAppDefsTab({ ws }: { ws: string }) {
  const { data: defs, isLoading } = useSuperAppDefs(ws);
  const createDef = useCreateSuperAppDef(ws);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewDef, setViewDef] = useState<SuperAppDefinition | null>(null);
  const form = useForm<DefForm>({ resolver: zodResolver(defSchema) });
  const { register, reset, formState: { errors } } = form;

  const handleCreate = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const data = form.getValues();
    try {
      await createDef.mutateAsync({ ...data, roles: [], linkedSMs: [], isActive: 1 });
      toast({ title: 'SuperApp definition created', description: data.name });
      reset();
      setCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create definition' });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-3 mt-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { reset(); setCreateOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />New SuperApp Def
        </Button>
      </div>
      {!defs?.length ? (
        <EmptyState icon={BookOpen} title="No SuperApp definitions" action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create First</Button>} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Version</TableHead><TableHead>Roles</TableHead>
                <TableHead>Linked SMs</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defs.map((def) => (
                <TableRow key={def._id}>
                  <TableCell className="font-medium">{def.name}</TableCell>
                  <TableCell className="font-mono text-xs">{def.version}</TableCell>
                  <TableCell>{def.roles.length}</TableCell>
                  <TableCell>{def.linkedSMs.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(def.createdAt)}</TableCell>
                  <TableCell><Badge variant={def.isActive ? 'success' : 'secondary'}>{def.isActive ? 'active' : 'inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewDef(def)}>
                      <Eye className="h-3 w-3" />View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="New SuperApp Definition" description="Define a new SuperApp for deployment." onSubmit={handleCreate} isLoading={createDef.isPending} submitLabel="Create">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Name</Label><Input placeholder="Trade Finance" {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          <div className="space-y-1.5"><Label>Version</Label><Input placeholder="1.0.0" {...register('version')} />{errors.version && <p className="text-xs text-destructive">{errors.version.message}</p>}</div>
        </div>
        <div className="space-y-1.5"><Label>Description</Label><Input placeholder="Describe this SuperApp" {...register('desc')} />{errors.desc && <p className="text-xs text-destructive">{errors.desc.message}</p>}</div>
        <div className="space-y-1.5"><Label>Sponsor Param ID</Label><Input placeholder="PARAM_..." {...register('sponsor')} />{errors.sponsor && <p className="text-xs text-destructive">{errors.sponsor.message}</p>}</div>
      </FormDialog>
      <Dialog open={!!viewDef} onOpenChange={(o) => { if (!o) setViewDef(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{viewDef?.name} <span className="text-muted-foreground font-normal">v{viewDef?.version}</span></DialogTitle></DialogHeader>
          {viewDef && <JsonViewer data={viewDef} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
