import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, UserX, Trash2 } from 'lucide-react';
import { useUsers, useAddUser } from '@/hooks/use-workspace';
import { suspendUser } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { useSuperAppStore } from '@/store/superapp.store';
import { usePlants } from '@/hooks/use-workspace';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import type { AppUser } from '@/types/workspace';

const userSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(2, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  orgParamId: z.string().min(1, 'Organization Param ID is required'),
  partnerId: z.string().optional(),
  isOrgAdmin: z.boolean().default(false),
  plantTeams: z.array(
    z.object({ plant: z.string().min(1), teams: z.string() })
  ).default([]),
});

type UserForm = z.infer<typeof userSchema>;

export function UsersPage() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
  const { activeSuperApp } = useSuperAppStore();
  const qc = useQueryClient();

  const saId = superAppId ?? activeSuperApp?.paramId ?? '';
  const [selectedRole, setSelectedRole] = useState('');
  const roles = activeSuperApp?.roles ?? [];

  const { data: users, isLoading } = useUsers(workspaceId ?? '', saId, selectedRole);
  const { data: plants } = usePlants(workspaceId ?? '');
  const addUser = useAddUser(workspaceId ?? '', saId, selectedRole);

  const [createOpen, setCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AppUser | null>(null);
  const [suspending, setSuspending] = useState(false);

  const form = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: { isOrgAdmin: false, plantTeams: [] } });
  const { register, watch, setValue, reset, formState: { errors } } = form;
  const { fields: plantTeamFields, append: appendPlantTeam, remove: removePlantTeam } = useFieldArray({ control: form.control, name: 'plantTeams' });

  // Get teams for the selected role
  const teamOptions = roles.find((r) => r.name === (watch('role') ?? selectedRole))?.teams?.map((t) => t.name) ?? [];

  const handleCreate = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const data = form.getValues();
    try {
      await addUser.mutateAsync({
        email: data.email,
        name: data.name,
        orgParamId: data.orgParamId,
        partnerId: data.partnerId || null,
        isOrgAdmin: data.isOrgAdmin,
        plantTeams: data.plantTeams.map((pt) => ({
          plant: pt.plant,
          teams: pt.teams ? pt.teams.split(',').map((t) => t.trim()).filter(Boolean) : [],
        })),
      });
      toast({ title: 'User added', description: data.email });
      reset();
      setCreateOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to add user' });
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      await suspendUser(saId, suspendTarget.userId);
      await qc.invalidateQueries({ queryKey: workspaceKeys.users(workspaceId ?? '', saId) });
      toast({ title: 'User suspended', description: suspendTarget.email });
      setSuspendTarget(null);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to suspend user' });
    } finally {
      setSuspending(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">{users?.length ?? 0} users</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Role filter */}
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { reset(); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {!users?.length ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={selectedRole ? `No users with role "${selectedRole}".` : 'Add users to this SuperApp.'}
          action={<Button onClick={() => setCreateOpen(true)}>Add User</Button>}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plants / Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.userId}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.orgParamId}
                  </TableCell>
                  <TableCell>
                    {user.isOrgAdmin
                      ? <Badge variant="info">Admin</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {user.plantTeams.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.plantTeams.map((pt) => (
                          <Badge key={pt.plant} variant="secondary" className="text-xs">
                            {pt.plant}
                          </Badge>
                        ))}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setSuspendTarget(user)}
                      >
                        <UserX className="mr-1 h-3 w-3" />
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

      {/* Add User Dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add User"
        description="Grant a user access to this SuperApp."
        onSubmit={handleCreate}
        isLoading={addUser.isPending}
        submitLabel="Add User"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input placeholder="user@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Jane Doe" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch('role') ?? ''} onValueChange={(v) => setValue('role', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Org Param ID</Label>
            <Input placeholder="PARAM_..." {...register('orgParamId')} />
            {errors.orgParamId && <p className="text-xs text-destructive">{errors.orgParamId.message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Org Admin</Label>
            <p className="text-xs text-muted-foreground">Grant organization admin privileges</p>
          </div>
          <Switch
            checked={watch('isOrgAdmin')}
            onCheckedChange={(v) => setValue('isOrgAdmin', v)}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Plant & Team Assignments</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => appendPlantTeam({ plant: '', teams: '' })}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Plant
            </Button>
          </div>
          {plantTeamFields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2">
              <Select
                value={watch(`plantTeams.${idx}.plant`) ?? ''}
                onValueChange={(v) => setValue(`plantTeams.${idx}.plant`, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={teamOptions.length ? teamOptions.join(', ') : 'team1, team2'}
                className="flex-1"
                {...register(`plantTeams.${idx}.teams`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => removePlantTeam(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {plantTeamFields.length === 0 && (
            <p className="text-xs text-muted-foreground">No plant assignments. User gets default access.</p>
          )}
        </div>
      </FormDialog>

      {/* Suspend Confirmation */}
      <FormDialog
        open={!!suspendTarget}
        onOpenChange={(o) => { if (!o) setSuspendTarget(null); }}
        title="Suspend User"
        description={`Suspend "${suspendTarget?.email}"? They will lose all access.`}
        onSubmit={handleSuspend}
        isLoading={suspending}
        submitLabel="Suspend User"
        destructive
      >
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          The user will be unable to log in or perform any actions until reactivated.
        </div>
      </FormDialog>
    </div>
  );
}
