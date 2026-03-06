import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus, ShieldAlert } from 'lucide-react';
import { useOrgs, useOnboardPartner } from '@/hooks/use-workspace';
import { updateOrgStatus } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { useSuperAppStore } from '@/store/superapp.store';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import type { Organization } from '@/types/workspace';

const orgSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  orgName: z.string().min(2, 'Organization name is required'),
  orgParamId: z.string().min(1, 'Param ID is required'),
  taxId: z.string().optional(),
  legalName: z.string().optional(),
  telephone: z.string().optional(),
  orgAdmin: z.string().optional(),
});

type OrgForm = z.infer<typeof orgSchema>;

export function OrgsPage() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
  const { activeSuperApp } = useSuperAppStore();
  const qc = useQueryClient();

  const saId = superAppId ?? activeSuperApp?.paramId ?? '';
  const { data: orgs, isLoading } = useOrgs(workspaceId ?? '', saId);
  const onboardPartner = useOnboardPartner(workspaceId ?? '', saId);

  const [createOpen, setCreateOpen] = useState(false);
  const [suspendOrg, setSuspendOrg] = useState<Organization | null>(null);
  const [suspending, setSuspending] = useState(false);

  const roles = activeSuperApp?.roles?.map((r) => r.name) ?? [];

  const form = useForm<OrgForm>({ resolver: zodResolver(orgSchema) });
  const { register, setValue, watch, reset, formState: { errors } } = form;

  const handleCreate = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const data = form.getValues();
    try {
      await onboardPartner.mutateAsync({
        role: data.role,
        org: {
          paramId: data.orgParamId,
          name: data.orgName,
          taxId: data.taxId,
          legalName: data.legalName,
          telephone: data.telephone,
        },
        orgAdmin: data.orgAdmin || undefined,
      });
      toast({ title: 'Partner onboarded', description: data.orgName });
      reset();
      setCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to onboard partner' });
    }
  };

  const handleSuspend = async () => {
    if (!suspendOrg) return;
    setSuspending(true);
    try {
      await updateOrgStatus(saId, suspendOrg.role, suspendOrg.org.paramId, 'suspended');
      await qc.invalidateQueries({ queryKey: workspaceKeys.orgs(workspaceId ?? '', saId) });
      toast({ title: 'Organization suspended' });
      setSuspendOrg(null);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to suspend organization' });
    } finally {
      setSuspending(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">{orgs?.length ?? 0} partner organizations</p>
        </div>
        <Button size="sm" onClick={() => { reset(); setCreateOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Onboard Partner
        </Button>
      </div>

      {!orgs?.length ? (
        <EmptyState
          icon={Building2}
          title="No organizations"
          description="Onboard partner organizations to this SuperApp."
          action={<Button onClick={() => setCreateOpen(true)}>Onboard Partner</Button>}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Param ID</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{org.org.name}</p>
                      {org.isSponsorOrg && (
                        <span className="text-xs text-primary font-medium">Sponsor</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{org.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {org.org.paramId}
                  </TableCell>
                  <TableCell className="text-sm">{org.orgAdmin ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={org.status === 'active' ? 'success' : 'warning'}>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {org.status === 'active' && !org.isSponsorOrg && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 text-xs"
                        onClick={() => setSuspendOrg(org)}
                      >
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Onboard Dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Onboard Partner Organization"
        description="Register a partner organization in this SuperApp."
        onSubmit={handleCreate}
        isLoading={onboardPartner.isPending}
        submitLabel="Onboard"
      >
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={watch('role') ?? ''} onValueChange={(v) => setValue('role', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.length ? (
                roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)
              ) : (
                <SelectItem value="partner">partner</SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Organization Name</Label>
            <Input placeholder="Acme Corp" {...register('orgName')} />
            {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Param ID</Label>
            <Input placeholder="PARAM_..." {...register('orgParamId')} />
            {errors.orgParamId && <p className="text-xs text-destructive">{errors.orgParamId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Legal Name <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="Acme Corporation Pvt Ltd" {...register('legalName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="GSTIN / VAT" {...register('taxId')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Telephone <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="+91 XXXXX XXXXX" {...register('telephone')} />
          </div>
          <div className="space-y-1.5">
            <Label>Org Admin Email <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="admin@acme.com" {...register('orgAdmin')} />
          </div>
        </div>
      </FormDialog>

      {/* Suspend Confirmation Dialog */}
      <FormDialog
        open={!!suspendOrg}
        onOpenChange={(o) => { if (!o) setSuspendOrg(null); }}
        title="Suspend Organization"
        description={`Are you sure you want to suspend "${suspendOrg?.org.name}"? Their users will lose access.`}
        onSubmit={handleSuspend}
        isLoading={suspending}
        submitLabel="Suspend"
        destructive
      >
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          This action will suspend all access for this organization.
        </div>
      </FormDialog>
    </div>
  );
}
