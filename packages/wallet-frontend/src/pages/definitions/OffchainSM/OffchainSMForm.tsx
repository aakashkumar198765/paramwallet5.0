import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCreateOffchainSM, useUpdateOffchainSM, useOffchainSM } from '@/hooks/useDefinitions';
import { deployOffchainSM } from '@/api/paramgateway/definitions/offchainSm';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  smType: z.string().default('offchain'),
  startAt: z.string().min(1, 'Start state is required'),
  roles: z.string().min(1, 'At least one role'),
});

type FormValues = z.infer<typeof schema>;

export default function OffchainSMForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const { data: existing } = useOffchainSM(id ?? '');
  const createMutation = useCreateOffchainSM();
  const updateMutation = useUpdateOffchainSM();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? '',
      displayName: existing?.displayName ?? '',
      smType: existing?.smType ?? 'offchain',
      startAt: existing?.startAt ?? '',
      roles: existing?.roles.join(', ') ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    const payload = {
      name: data.name,
      displayName: data.displayName,
      smType: data.smType,
      startAt: data.startAt,
      roles: data.roles.split(',').map((r) => r.trim()),
      states: {},
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast({ title: 'Updated' });
      } else {
        await createMutation.mutateAsync(payload);
        await deployOffchainSM(payload);
        toast({ title: 'Deployed' });
      }
      navigate('/definitions/offchain/sm');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/offchain/sm')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{isEdit ? 'Edit' : 'New'} Offchain SM</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>State Machine Definition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input placeholder="my-offchain-sm" {...form.register('name')} /></div>
            <div className="space-y-2"><Label>Display Name</Label><Input placeholder="My Offchain SM" {...form.register('displayName')} /></div>
            <div className="space-y-2"><Label>Start State</Label><Input placeholder="draft" {...form.register('startAt')} /></div>
            <div className="space-y-2"><Label>Roles (comma-separated)</Label><Input placeholder="buyer, seller" {...form.register('roles')} /></div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Deploy SM'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
