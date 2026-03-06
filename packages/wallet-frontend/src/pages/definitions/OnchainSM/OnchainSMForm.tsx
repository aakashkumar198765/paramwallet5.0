import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCreateOnchainSM, useUpdateOnchainSM, useOnchainSM } from '@/hooks/useDefinitions';
import { deployOnchainSM } from '@/api/paramgateway/definitions/onchainSm';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z0-9-_]+$/, 'Lowercase alphanumeric, dash, underscore only'),
  displayName: z.string().min(1, 'Display name is required'),
  smType: z.string().min(1, 'SM type is required'),
  startAt: z.string().min(1, 'Start state is required'),
  roles: z.string().min(1, 'At least one role'),
});

type FormValues = z.infer<typeof schema>;

export default function OnchainSMForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const { data: existing } = useOnchainSM(id ?? '');
  const createMutation = useCreateOnchainSM();
  const updateMutation = useUpdateOnchainSM();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? '',
      displayName: existing?.displayName ?? '',
      smType: existing?.smType ?? 'onchain',
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
        toast({ title: 'Updated', description: 'SM definition updated.' });
      } else {
        await createMutation.mutateAsync(payload);
        // Deploy to ParamGateway
        await deployOnchainSM(payload);
        toast({ title: 'Deployed', description: 'SM deployed to ParamGateway.' });
      }
      navigate('/definitions/onchain/sm');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/onchain/sm')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{isEdit ? 'Edit' : 'New'} Onchain SM</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>State Machine Definition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (ID)</Label>
              <Input id="name" placeholder="my-sm-v1" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" placeholder="My State Machine" {...form.register('displayName')} />
              {form.formState.errors.displayName && <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smType">SM Type</Label>
              <Input id="smType" placeholder="onchain" {...form.register('smType')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startAt">Start State</Label>
              <Input id="startAt" placeholder="draft" {...form.register('startAt')} />
              {form.formState.errors.startAt && <p className="text-xs text-destructive">{form.formState.errors.startAt.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roles">Roles (comma-separated)</Label>
              <Input id="roles" placeholder="buyer, seller, admin" {...form.register('roles')} />
              {form.formState.errors.roles && <p className="text-xs text-destructive">{form.formState.errors.roles.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Deploy SM'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
