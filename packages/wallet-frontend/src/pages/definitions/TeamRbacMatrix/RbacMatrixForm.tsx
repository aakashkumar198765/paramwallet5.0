import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createDefinitionRbacMatrix } from '@/api/team-rbac.api';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  superAppId: z.string().min(1, 'SuperApp ID is required'),
  smId: z.string().min(1, 'SM ID is required'),
  smName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RbacMatrixForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { superAppId: '', smId: '', smName: '' },
  });

  const onSubmit = async (data: FormValues) => {
    const payload = {
      superAppId: data.superAppId,
      smId: data.smId,
      smName: data.smName ?? data.smId,
      permissions: [],
    };
    try {
      await createDefinitionRbacMatrix(data.superAppId, payload);
      toast({ title: 'Created', description: 'RBAC matrix created.' });
      navigate('/definitions/rbac');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/definitions/rbac')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{isEdit ? 'Edit' : 'New'} RBAC Matrix</h2>
      </div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Team RBAC Matrix</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>SuperApp ID</Label><Input placeholder="superapp-id" {...form.register('superAppId')} /></div>
            <div className="space-y-2"><Label>SM ID</Label><Input placeholder="sm-id" {...form.register('smId')} /></div>
            <div className="space-y-2"><Label>SM Name (optional)</Label><Input placeholder="Display name" {...form.register('smName')} /></div>
            <Button type="submit" className="w-full">Create Matrix</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
