import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { usePlants, useCreatePlant } from '@/hooks/use-workspace';
import { updatePlant, deletePlant } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import type { Plant } from '@/types/workspace';

const plantSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Max 20 chars'),
  name: z.string().min(2, 'Name is required'),
  isActive: z.boolean().default(true),
});

type PlantForm = z.infer<typeof plantSchema>;

export function PlantsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const { data: plants, isLoading } = usePlants(workspaceId ?? '');
  const createPlant = useCreatePlant(workspaceId ?? '');

  const createForm = useForm<PlantForm>({ resolver: zodResolver(plantSchema), defaultValues: { isActive: true } });
  const editForm = useForm<PlantForm>({ resolver: zodResolver(plantSchema) });

  const handleCreate = async () => {
    const valid = await createForm.trigger();
    if (!valid) return;
    const data = createForm.getValues();
    try {
      await createPlant.mutateAsync(data);
      toast({ title: 'Plant created', description: data.name });
      createForm.reset();
      setCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create plant' });
    }
  };

  const openEdit = (plant: Plant) => {
    setEditPlant(plant);
    editForm.reset({ code: plant.code, name: plant.name, isActive: plant.isActive });
  };

  const handleEdit = async () => {
    if (!editPlant) return;
    const valid = await editForm.trigger();
    if (!valid) return;
    const data = editForm.getValues();
    try {
      await updatePlant(editPlant.code, { name: data.name, isActive: data.isActive });
      await qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceId ?? '') });
      toast({ title: 'Plant updated' });
      setEditPlant(null);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update plant' });
    }
  };

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    try {
      await deletePlant(code);
      await qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceId ?? '') });
      toast({ title: 'Plant deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete plant' });
    } finally {
      setDeletingCode(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Plants</h1>
          <p className="text-sm text-muted-foreground">{plants?.length ?? 0} plants configured</p>
        </div>
        <Button size="sm" onClick={() => { createForm.reset({ isActive: true }); setCreateOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Plant
        </Button>
      </div>

      {!plants?.length ? (
        <EmptyState
          icon={MapPin}
          title="No plants configured"
          description="Add plants to associate with organizations and teams."
          action={<Button onClick={() => setCreateOpen(true)}>Add Plant</Button>}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Param ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plants.map((plant) => (
                <TableRow key={plant._id}>
                  <TableCell className="font-mono text-xs font-semibold">{plant.code}</TableCell>
                  <TableCell className="font-medium">{plant.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{plant.paramId || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={plant.isActive ? 'success' : 'secondary'}>
                      {plant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plant)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(plant.code)}
                        disabled={deletingCode === plant.code}
                      >
                        {deletingCode === plant.code
                          ? <LoadingSpinner size="sm" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Plant"
        description="Create a new plant location for your workspace."
        onSubmit={handleCreate}
        isLoading={createPlant.isPending}
        submitLabel="Add Plant"
      >
        <PlantFormFields form={createForm} disableCode={false} />
      </FormDialog>

      {/* Edit Dialog */}
      <FormDialog
        open={!!editPlant}
        onOpenChange={(o) => { if (!o) setEditPlant(null); }}
        title="Edit Plant"
        description={`Editing plant: ${editPlant?.code}`}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
      >
        <PlantFormFields form={editForm} disableCode={true} />
      </FormDialog>
    </div>
  );
}

function PlantFormFields({ form, disableCode }: { form: ReturnType<typeof useForm<PlantForm>>; disableCode: boolean }) {
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="plant-code">Plant Code</Label>
        <Input
          id="plant-code"
          placeholder="PLT001"
          disabled={disableCode}
          {...register('code')}
        />
        {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plant-name">Plant Name</Label>
        <Input id="plant-name" placeholder="Mumbai North Plant" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="plant-active">Active</Label>
        <Switch
          id="plant-active"
          checked={watch('isActive')}
          onCheckedChange={(v) => setValue('isActive', v)}
        />
      </div>
    </>
  );
}
