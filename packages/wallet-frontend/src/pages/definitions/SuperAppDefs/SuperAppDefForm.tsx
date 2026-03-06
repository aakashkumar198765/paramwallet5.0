import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCreateSuperAppDef, useUpdateSuperAppDef, useSuperAppDef } from '@/hooks/useDefinitions';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  desc: z.string().min(1, 'Description is required'),
  version: z.string().min(1, 'Version is required'),
  sponsor: z.string().min(1, 'Sponsor is required'),
  linkedSMs: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SuperAppDefForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const { data: existing } = useSuperAppDef(id ?? '');
  const createMutation = useCreateSuperAppDef();
  const updateMutation = useUpdateSuperAppDef();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? '',
      desc: existing?.desc ?? '',
      version: existing?.version ?? '1.0.0',
      sponsor: existing?.sponsor ?? '',
      linkedSMs: existing?.linkedSMs.join(', ') ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    const payload = {
      name: data.name,
      desc: data.desc,
      version: data.version,
      sponsor: data.sponsor,
      linkedSMs: data.linkedSMs.split(',').map((s) => s.trim()).filter(Boolean),
      roles: [],
      isActive: 1,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast({ title: 'Updated' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Created', description: 'SuperApp definition created.' });
      }
      navigate('/definitions/superapps');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/superapps')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{isEdit ? 'Edit' : 'New'} SuperApp Definition</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>SuperApp Definition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input placeholder="my-superapp" {...form.register('name')} /></div>
            <div className="space-y-2"><Label>Description</Label><Input placeholder="Description..." {...form.register('desc')} /></div>
            <div className="space-y-2"><Label>Version</Label><Input placeholder="1.0.0" {...form.register('version')} /></div>
            <div className="space-y-2"><Label>Sponsor (Param ID)</Label><Input placeholder="param-id" {...form.register('sponsor')} /></div>
            <div className="space-y-2"><Label>Linked SMs (comma-separated)</Label><Input placeholder="sm-id-1, sm-id-2" {...form.register('linkedSMs')} /></div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create SuperApp'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
