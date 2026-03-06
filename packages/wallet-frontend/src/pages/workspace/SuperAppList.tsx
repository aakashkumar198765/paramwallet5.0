import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Play, Download, ShieldAlert } from 'lucide-react';
import { useInstalledSuperApps, useInstallSuperApp } from '@/hooks/use-workspace';
import { updateSuperAppStatus } from '@/api/workspace.api';
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
import { toast } from '@/hooks/use-toast';
import type { InstalledSuperApp } from '@/types/workspace';

const installSchema = z.object({
  superAppId: z.string().min(1, 'SuperApp ID is required'),
});
type InstallForm = z.infer<typeof installSchema>;

export function SuperAppList() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: superApps, isLoading } = useInstalledSuperApps(workspaceId ?? '');
  const installSuperApp = useInstallSuperApp(workspaceId ?? '');
  const { setActiveSuperApp } = useSuperAppStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [installOpen, setInstallOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<InstalledSuperApp | null>(null);
  const [suspending, setSuspending] = useState(false);

  const form = useForm<InstallForm>({ resolver: zodResolver(installSchema) });
  const { register, reset, formState: { errors } } = form;

  const handleInstall = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const { superAppId } = form.getValues();
    try {
      await installSuperApp.mutateAsync(superAppId);
      toast({ title: 'SuperApp installed', description: `ID: ${superAppId}` });
      reset();
      setInstallOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to install SuperApp' });
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      await updateSuperAppStatus(suspendTarget.paramId, 'suspended');
      await qc.invalidateQueries({ queryKey: workspaceKeys.superApps(workspaceId ?? '') });
      toast({ title: 'SuperApp suspended' });
      setSuspendTarget(null);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to suspend SuperApp' });
    } finally {
      setSuspending(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SuperApps</h1>
          <p className="text-sm text-muted-foreground">{superApps?.length ?? 0} installed</p>
        </div>
        <Button size="sm" onClick={() => { reset(); setInstallOpen(true); }}>
          <Download className="mr-1.5 h-4 w-4" />
          Install SuperApp
        </Button>
      </div>

      {!superApps?.length ? (
        <EmptyState
          icon={Layers}
          title="No SuperApps installed"
          description="Install a SuperApp to start managing documents and workflows."
          action={<Button onClick={() => setInstallOpen(true)}>Install SuperApp</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {superApps.map((sa) => (
            <div key={sa._id} className="rounded-lg border bg-card p-5 space-y-4 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    {sa.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{sa.name}</p>
                    <p className="text-xs text-muted-foreground">v{sa.version}</p>
                  </div>
                </div>
                <Badge variant={sa.status === 'active' ? 'success' : 'warning'} className="shrink-0">
                  {sa.status}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{sa.desc}</p>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {sa.linkedSMs.length} SMs
                </span>
                <span>{sa.roles.length} roles</span>
                <span className="font-mono truncate max-w-[100px]" title={sa.paramId}>
                  {sa.paramId.slice(0, 12)}…
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={sa.status !== 'active'}
                  onClick={() => {
                    setActiveSuperApp(sa);
                    navigate(`/${workspaceId}/sa/${sa.paramId}/documents`);
                  }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Open
                </Button>
                {sa.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setSuspendTarget(sa)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Install Dialog */}
      <FormDialog
        open={installOpen}
        onOpenChange={setInstallOpen}
        title="Install SuperApp"
        description="Enter the SuperApp ID provided by your administrator."
        onSubmit={handleInstall}
        isLoading={installSuperApp.isPending}
        submitLabel="Install"
      >
        <div className="space-y-1.5">
          <Label>SuperApp ID</Label>
          <Input
            placeholder="sa_xxxxxxxxxxxxxxxx"
            className="font-mono"
            {...register('superAppId')}
          />
          {errors.superAppId && (
            <p className="text-xs text-destructive">{errors.superAppId.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Contact your Param Wallet administrator to obtain a SuperApp ID.
          </p>
        </div>
      </FormDialog>

      {/* Suspend Confirmation */}
      <FormDialog
        open={!!suspendTarget}
        onOpenChange={(o) => { if (!o) setSuspendTarget(null); }}
        title="Suspend SuperApp"
        description={`Are you sure you want to suspend "${suspendTarget?.name}"?`}
        onSubmit={handleSuspend}
        isLoading={suspending}
        submitLabel="Suspend"
        destructive
      >
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          All users of this SuperApp will lose access until it is reactivated.
        </div>
      </FormDialog>
    </div>
  );
}
