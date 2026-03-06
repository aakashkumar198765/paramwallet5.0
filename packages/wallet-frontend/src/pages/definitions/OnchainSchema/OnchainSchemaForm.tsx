import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCreateOnchainSchema, useUpdateOnchainSchema, useOnchainSchema } from '@/hooks/useDefinitions';
import { deployOnchainSchema } from '@/api/paramgateway/definitions/onchainSchema';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  desc: z.string().min(1, 'Description is required'),
  version: z.string().min(1, 'Version is required'),
});

type FormValues = z.infer<typeof formSchema>;

export default function OnchainSchemaForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const { data: existing } = useOnchainSchema(id ?? '');
  const createMutation = useCreateOnchainSchema();
  const updateMutation = useUpdateOnchainSchema();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: existing?.displayName ?? '',
      desc: existing?.desc ?? '',
      version: existing?.version ?? '1.0.0',
    },
  });

  const onSubmit = async (data: FormValues) => {
    const payload = { ...data, properties: {} };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast({ title: 'Updated' });
      } else {
        await createMutation.mutateAsync(payload);
        await deployOnchainSchema(payload);
        toast({ title: 'Deployed', description: 'Schema deployed to ParamGateway.' });
      }
      navigate('/definitions/onchain/schema');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/onchain/schema')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{isEdit ? 'Edit' : 'New'} Onchain Schema</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Schema Definition</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input placeholder="My Schema" {...form.register('displayName')} />
              {form.formState.errors.displayName && <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Schema for..." {...form.register('desc')} />
              {form.formState.errors.desc && <p className="text-xs text-destructive">{form.formState.errors.desc.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input placeholder="1.0.0" {...form.register('version')} />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Deploy Schema'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
