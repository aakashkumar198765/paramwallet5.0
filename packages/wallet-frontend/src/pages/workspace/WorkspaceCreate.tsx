import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/store/workspace.store';
import { toast } from '@/hooks/use-toast';

const schema = z.object({
  workspaceName: z.string().min(2, 'Name must be at least 2 characters'),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  exchangeParamId: z.string().min(1, 'Exchange Param ID is required'),
});

type FormData = z.infer<typeof schema>;

export function WorkspaceCreate() {
  const navigate = useNavigate();
  const { setActiveWorkspace } = useWorkspaceStore();
  const createWorkspace = useCreateWorkspace();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createWorkspace.mutateAsync(data);
      setActiveWorkspace(data.subdomain);
      toast({ title: 'Workspace created' });
      navigate(`/${data.subdomain}`);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create workspace' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Create workspace</h1>
          <p className="text-sm text-muted-foreground">Set up a new Param Wallet workspace</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input id="workspaceName" placeholder="Acme Corp" {...register('workspaceName')} />
            {errors.workspaceName && (
              <p className="text-xs text-destructive">{errors.workspaceName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subdomain">Subdomain</Label>
            <Input id="subdomain" placeholder="acme-corp" {...register('subdomain')} />
            {errors.subdomain && (
              <p className="text-xs text-destructive">{errors.subdomain.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exchangeParamId">Exchange Param ID</Label>
            <Input id="exchangeParamId" placeholder="PARAM_..." {...register('exchangeParamId')} />
            {errors.exchangeParamId && (
              <p className="text-xs text-destructive">{errors.exchangeParamId.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={createWorkspace.isPending}>
            {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}
