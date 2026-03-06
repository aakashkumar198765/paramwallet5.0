import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { useTheme } from '@/hooks/use-theme';
import { updateWorkspace } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/shared/FormDialog';
import { toast } from '@/hooks/use-toast';
import { PlantsPage } from '@/pages/workspace/PlantsPage';
import { UsersPage } from '@/pages/workspace/UsersPage';
import { OrgsPage } from '@/pages/workspace/OrgsPage';
import { RbacPage } from '@/pages/workspace/RbacPage';

const wsSchema = z.object({ workspaceName: z.string().min(2, 'Name must be at least 2 chars') });
type WsForm = z.infer<typeof wsSchema>;

type Tab = 'workspace' | 'profile' | 'plants' | 'users' | 'orgs' | 'rbac' | 'appearance';

const TABS: { value: Tab; label: string }[] = [
  { value: 'workspace', label: 'Workspace' },
  { value: 'profile', label: 'Profile' },
  { value: 'plants', label: 'Plants' },
  { value: 'users', label: 'Users' },
  { value: 'orgs', label: 'Organizations' },
  { value: 'rbac', label: 'RBAC' },
  { value: 'appearance', label: 'Appearance' },
];

export function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { name, email, paramId } = useAuthStore();
  const { activeWorkspace, workspaceList, setWorkspaceList } = useWorkspaceStore();
  const { activeSuperApp } = useSuperAppStore();
  const { theme, toggleTheme } = useTheme();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('workspace');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const ws = workspaceList.find((w) => w.subdomain === (workspaceId ?? activeWorkspace));

  const form = useForm<WsForm>({
    resolver: zodResolver(wsSchema),
    defaultValues: { workspaceName: ws?.workspaceName ?? '' },
  });
  const { register, reset, formState: { errors } } = form;

  const handleRename = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    setRenaming(true);
    try {
      const { workspaceName } = form.getValues();
      const updated = await updateWorkspace({ workspaceName });
      setWorkspaceList(workspaceList.map((w) =>
        w.subdomain === ws?.subdomain ? { ...w, workspaceName: updated.workspaceName } : w
      ));
      await qc.invalidateQueries({ queryKey: workspaceKeys.list() });
      toast({ title: 'Workspace renamed', description: updated.workspaceName });
      setRenameOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to rename workspace' });
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="p-toolbar">
        <h1 className="p-page-title" style={{ fontSize: 15 }}>Settings</h1>
        {activeSuperApp && (
          <span className="p-badge p-badge-primary ml-2">{activeSuperApp.name}</span>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="p-subtabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`p-subtab${tab === t.value ? ' active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'workspace' && (
          <div className="p-page" style={{ maxWidth: 560 }}>
            <p className="p-section-title" style={{ marginBottom: 12 }}>Workspace Details</p>
            <div className="p-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Name</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{ws?.workspaceName ?? '—'}</span>
                  {ws && (
                    <Button variant="ghost" size="icon" style={{ width: 24, height: 24 }}
                      onClick={() => { reset({ workspaceName: ws.workspaceName }); setRenameOpen(true); }}>
                      <Pencil style={{ width: 11, height: 11 }} />
                    </Button>
                  )}
                </div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Subdomain</span>
                <span className="p-tag">{ws?.subdomain ?? '—'}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Owner Param ID</span>
                <span className="p-tag" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws?.ownerParamId ?? '—'}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Status</span>
                <span className={`p-badge ${ws?.status === 'active' ? 'p-badge-success' : 'p-badge-warning'}`}>
                  {ws?.status ?? '—'}
                </span>
              </div>
            </div>

            <FormDialog
              open={renameOpen}
              onOpenChange={setRenameOpen}
              title="Rename Workspace"
              description="Update the display name of your workspace."
              onSubmit={handleRename}
              isLoading={renaming}
              submitLabel="Rename"
            >
              <div className="space-y-1.5">
                <Label>Workspace Name</Label>
                <Input placeholder="My Workspace" {...register('workspaceName')} />
                {errors.workspaceName && <p className="text-xs text-destructive">{errors.workspaceName.message}</p>}
              </div>
            </FormDialog>
          </div>
        )}

        {tab === 'profile' && (
          <div className="p-page" style={{ maxWidth: 560 }}>
            <p className="p-section-title" style={{ marginBottom: 12 }}>Account Information</p>
            <div className="p-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Name</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{name ?? '—'}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Email</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{email ?? '—'}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Param ID</span>
                <span className="p-tag" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{paramId ?? '—'}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'plants' && <PlantsPage />}

        {tab === 'users' && (
          activeSuperApp
            ? <UsersPage />
            : (
              <div className="p-empty">
                <p className="p-empty-title">No SuperApp selected</p>
                <p className="p-empty-desc">Open a SuperApp from the SuperApps page to manage its users here.</p>
              </div>
            )
        )}

        {tab === 'orgs' && (
          activeSuperApp
            ? <OrgsPage />
            : (
              <div className="p-empty">
                <p className="p-empty-title">No SuperApp selected</p>
                <p className="p-empty-desc">Open a SuperApp to manage its partner organizations here.</p>
              </div>
            )
        )}

        {tab === 'rbac' && (
          activeSuperApp
            ? <RbacPage />
            : (
              <div className="p-empty">
                <p className="p-empty-title">No SuperApp selected</p>
                <p className="p-empty-desc">Open a SuperApp to manage its RBAC matrix here.</p>
              </div>
            )
        )}

        {tab === 'appearance' && (
          <div className="p-page" style={{ maxWidth: 560 }}>
            <p className="p-section-title" style={{ marginBottom: 12 }}>Display</p>
            <div className="p-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Label htmlFor="dark-mode" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Dark mode</Label>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Toggle between light and dark theme</p>
              </div>
              <Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
