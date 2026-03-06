import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const userSchema = z.object({
    email: z.string().email('Valid email required'),
    name: z.string().min(2, 'Name is required'),
    role: z.string().min(1, 'Role is required'),
    orgParamId: z.string().min(1, 'Organization Param ID is required'),
    partnerId: z.string().optional(),
    isOrgAdmin: z.boolean().default(false),
    plantTeams: z.array(z.object({ plant: z.string().min(1), teams: z.string() })).default([]),
});
export function UsersPage() {
    const { workspaceId, superAppId } = useParams();
    const { activeSuperApp } = useSuperAppStore();
    const qc = useQueryClient();
    const saId = superAppId ?? activeSuperApp?.paramId ?? '';
    const [selectedRole, setSelectedRole] = useState('');
    const roles = activeSuperApp?.roles ?? [];
    const { data: users, isLoading } = useUsers(workspaceId ?? '', saId, selectedRole);
    const { data: plants } = usePlants(workspaceId ?? '');
    const addUser = useAddUser(workspaceId ?? '', saId, selectedRole);
    const [createOpen, setCreateOpen] = useState(false);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const [suspending, setSuspending] = useState(false);
    const form = useForm({ resolver: zodResolver(userSchema), defaultValues: { isOrgAdmin: false, plantTeams: [] } });
    const { register, watch, setValue, reset, formState: { errors } } = form;
    const { fields: plantTeamFields, append: appendPlantTeam, remove: removePlantTeam } = useFieldArray({ control: form.control, name: 'plantTeams' });
    // Get teams for the selected role
    const teamOptions = roles.find((r) => r.name === (watch('role') ?? selectedRole))?.teams?.map((t) => t.name) ?? [];
    const handleCreate = async () => {
        const valid = await form.trigger();
        if (!valid)
            return;
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
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to add user' });
        }
    };
    const handleSuspend = async () => {
        if (!suspendTarget)
            return;
        setSuspending(true);
        try {
            await suspendUser(saId, suspendTarget.userId);
            await qc.invalidateQueries({ queryKey: workspaceKeys.users(workspaceId ?? '', saId) });
            toast({ title: 'User suspended', description: suspendTarget.email });
            setSuspendTarget(null);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to suspend user' });
        }
        finally {
            setSuspending(false);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center p-12", children: _jsx(LoadingSpinner, {}) });
    return (_jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Users" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [users?.length ?? 0, " users"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Select, { value: selectedRole, onValueChange: setSelectedRole, children: [_jsx(SelectTrigger, { className: "w-40 h-8 text-xs", children: _jsx(SelectValue, { placeholder: "All roles" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "All roles" }), roles.map((r) => _jsx(SelectItem, { value: r.name, children: r.name }, r.name))] })] }), _jsxs(Button, { size: "sm", onClick: () => { reset(); setCreateOpen(true); }, children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "Add User"] })] })] }), !users?.length ? (_jsx(EmptyState, { icon: Users, title: "No users found", description: selectedRole ? `No users with role "${selectedRole}".` : 'Add users to this SuperApp.', action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Add User" }) })) : (_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "User" }), _jsx(TableHead, { children: "Role" }), _jsx(TableHead, { children: "Organization" }), _jsx(TableHead, { children: "Admin" }), _jsx(TableHead, { children: "Plants / Teams" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: users.map((user) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsxs("div", { children: [_jsx("p", { className: "font-medium text-sm", children: user.email }), _jsx("p", { className: "text-xs text-muted-foreground font-mono", children: user.userId })] }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: user.role }) }), _jsx(TableCell, { className: "font-mono text-xs text-muted-foreground", children: user.orgParamId }), _jsx(TableCell, { children: user.isOrgAdmin
                                            ? _jsx(Badge, { variant: "info", children: "Admin" })
                                            : _jsx("span", { className: "text-xs text-muted-foreground", children: "\u2014" }) }), _jsx(TableCell, { children: user.plantTeams.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-1", children: user.plantTeams.map((pt) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: pt.plant }, pt.plant))) })) : _jsx("span", { className: "text-xs text-muted-foreground", children: "\u2014" }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: user.status === 'active' ? 'success' : 'warning', children: user.status }) }), _jsx(TableCell, { className: "text-right", children: user.status === 'active' && (_jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs text-destructive hover:text-destructive", onClick: () => setSuspendTarget(user), children: [_jsx(UserX, { className: "mr-1 h-3 w-3" }), "Suspend"] })) })] }, user._id))) })] }) })), _jsxs(FormDialog, { open: createOpen, onOpenChange: setCreateOpen, title: "Add User", description: "Grant a user access to this SuperApp.", onSubmit: handleCreate, isLoading: addUser.isPending, submitLabel: "Add User", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Email" }), _jsx(Input, { placeholder: "user@example.com", ...register('email') }), errors.email && _jsx("p", { className: "text-xs text-destructive", children: errors.email.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Full Name" }), _jsx(Input, { placeholder: "Jane Doe", ...register('name') }), errors.name && _jsx("p", { className: "text-xs text-destructive", children: errors.name.message })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Role" }), _jsxs(Select, { value: watch('role') ?? '', onValueChange: (v) => setValue('role', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select role" }) }), _jsx(SelectContent, { children: roles.map((r) => _jsx(SelectItem, { value: r.name, children: r.name }, r.name)) })] }), errors.role && _jsx("p", { className: "text-xs text-destructive", children: errors.role.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Org Param ID" }), _jsx(Input, { placeholder: "PARAM_...", ...register('orgParamId') }), errors.orgParamId && _jsx("p", { className: "text-xs text-destructive", children: errors.orgParamId.message })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx(Label, { children: "Org Admin" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Grant organization admin privileges" })] }), _jsx(Switch, { checked: watch('isOrgAdmin'), onCheckedChange: (v) => setValue('isOrgAdmin', v) })] }), _jsx(Separator, {}), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Plant & Team Assignments" }), _jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "h-7 text-xs", onClick: () => appendPlantTeam({ plant: '', teams: '' }), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), "Add Plant"] })] }), plantTeamFields.map((field, idx) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Select, { value: watch(`plantTeams.${idx}.plant`) ?? '', onValueChange: (v) => setValue(`plantTeams.${idx}.plant`, v), children: [_jsx(SelectTrigger, { className: "flex-1", children: _jsx(SelectValue, { placeholder: "Plant" }) }), _jsx(SelectContent, { children: plants?.map((p) => (_jsxs(SelectItem, { value: p.code, children: [p.name, " (", p.code, ")"] }, p.code))) })] }), _jsx(Input, { placeholder: teamOptions.length ? teamOptions.join(', ') : 'team1, team2', className: "flex-1", ...register(`plantTeams.${idx}.teams`) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0 text-destructive", onClick: () => removePlantTeam(idx), children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }, field.id))), plantTeamFields.length === 0 && (_jsx("p", { className: "text-xs text-muted-foreground", children: "No plant assignments. User gets default access." }))] })] }), _jsx(FormDialog, { open: !!suspendTarget, onOpenChange: (o) => { if (!o)
                    setSuspendTarget(null); }, title: "Suspend User", description: `Suspend "${suspendTarget?.email}"? They will lose all access.`, onSubmit: handleSuspend, isLoading: suspending, submitLabel: "Suspend User", destructive: true, children: _jsx("div", { className: "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive", children: "The user will be unable to log in or perform any actions until reactivated." }) })] }));
}
