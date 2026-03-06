import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCreateWorkspace } from '@/hooks/useWorkspace';
import { ArrowLeft, Building2 } from 'lucide-react';

const schema = z.object({
  subdomain: z
    .string()
    .min(3, 'Minimum 3 characters')
    .max(32, 'Maximum 32 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  workspaceName: z.string().min(1, 'Workspace name is required'),
  ownerOrgName: z.string().min(1, 'Organization name is required'),
});

type FormValues = z.infer<typeof schema>;

export default function WorkspaceCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createWorkspace = useCreateWorkspace();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subdomain: '', workspaceName: '', ownerOrgName: '' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const ws = await createWorkspace.mutateAsync(data);
      toast({ title: 'Workspace created', description: `${ws.workspaceName} is ready.` });
      navigate(`/workspace/${ws.subdomain}`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create workspace.' });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/post-login')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">Create Workspace</h2>
      </div>

      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>New Workspace</CardTitle>
          </div>
          <CardDescription>
            A workspace is an isolated environment for your organization's SuperApps and documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                placeholder="my-company"
                {...form.register('subdomain')}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for your workspace URL
              </p>
              {form.formState.errors.subdomain && (
                <p className="text-xs text-destructive">{form.formState.errors.subdomain.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                placeholder="My Company Workspace"
                {...form.register('workspaceName')}
              />
              {form.formState.errors.workspaceName && (
                <p className="text-xs text-destructive">{form.formState.errors.workspaceName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerOrgName">Organization Name</Label>
              <Input
                id="ownerOrgName"
                placeholder="My Company Ltd."
                {...form.register('ownerOrgName')}
              />
              {form.formState.errors.ownerOrgName && (
                <p className="text-xs text-destructive">{form.formState.errors.ownerOrgName.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createWorkspace.isPending}
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create Workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
