import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const installSchema = z.object({
    superAppId: z.string().min(1, 'SuperApp ID is required'),
});
export function SuperAppList() {
    const { workspaceId } = useParams();
    const { data: superApps, isLoading } = useInstalledSuperApps(workspaceId ?? '');
    const installSuperApp = useInstallSuperApp(workspaceId ?? '');
    const { setActiveSuperApp } = useSuperAppStore();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [installOpen, setInstallOpen] = useState(false);
    const [suspendTarget, setSuspendTarget] = useState(null);
    const [suspending, setSuspending] = useState(false);
    const form = useForm({ resolver: zodResolver(installSchema) });
    const { register, reset, formState: { errors } } = form;
    const handleInstall = async () => {
        const valid = await form.trigger();
        if (!valid)
            return;
        const { superAppId } = form.getValues();
        try {
            await installSuperApp.mutateAsync(superAppId);
            toast({ title: 'SuperApp installed', description: `ID: ${superAppId}` });
            reset();
            setInstallOpen(false);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to install SuperApp' });
        }
    };
    const handleSuspend = async () => {
        if (!suspendTarget)
            return;
        setSuspending(true);
        try {
            await updateSuperAppStatus(suspendTarget.paramId, 'suspended');
            await qc.invalidateQueries({ queryKey: workspaceKeys.superApps(workspaceId ?? '') });
            toast({ title: 'SuperApp suspended' });
            setSuspendTarget(null);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to suspend SuperApp' });
        }
        finally {
            setSuspending(false);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center p-12", children: _jsx(LoadingSpinner, {}) });
    return (_jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "SuperApps" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [superApps?.length ?? 0, " installed"] })] }), _jsxs(Button, { size: "sm", onClick: () => { reset(); setInstallOpen(true); }, children: [_jsx(Download, { className: "mr-1.5 h-4 w-4" }), "Install SuperApp"] })] }), !superApps?.length ? (_jsx(EmptyState, { icon: Layers, title: "No SuperApps installed", description: "Install a SuperApp to start managing documents and workflows.", action: _jsx(Button, { onClick: () => setInstallOpen(true), children: "Install SuperApp" }) })) : (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: superApps.map((sa) => (_jsxs("div", { className: "rounded-lg border bg-card p-5 space-y-4 flex flex-col", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm", children: sa.name[0].toUpperCase() }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-sm", children: sa.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["v", sa.version] })] })] }), _jsx(Badge, { variant: sa.status === 'active' ? 'success' : 'warning', className: "shrink-0", children: sa.status })] }), _jsx("p", { className: "text-xs text-muted-foreground line-clamp-2 flex-1", children: sa.desc }), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Layers, { className: "h-3 w-3" }), sa.linkedSMs.length, " SMs"] }), _jsxs("span", { children: [sa.roles.length, " roles"] }), _jsxs("span", { className: "font-mono truncate max-w-[100px]", title: sa.paramId, children: [sa.paramId.slice(0, 12), "\u2026"] })] }), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsxs(Button, { size: "sm", className: "flex-1 gap-1.5", disabled: sa.status !== 'active', onClick: () => {
                                        setActiveSuperApp(sa);
                                        navigate(`/${workspaceId}/sa/${sa.paramId}/documents`);
                                    }, children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Open"] }), sa.status === 'active' && (_jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10", onClick: () => setSuspendTarget(sa), children: [_jsx(ShieldAlert, { className: "h-3.5 w-3.5" }), "Suspend"] }))] })] }, sa._id))) })), _jsx(FormDialog, { open: installOpen, onOpenChange: setInstallOpen, title: "Install SuperApp", description: "Enter the SuperApp ID provided by your administrator.", onSubmit: handleInstall, isLoading: installSuperApp.isPending, submitLabel: "Install", children: _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "SuperApp ID" }), _jsx(Input, { placeholder: "sa_xxxxxxxxxxxxxxxx", className: "font-mono", ...register('superAppId') }), errors.superAppId && (_jsx("p", { className: "text-xs text-destructive", children: errors.superAppId.message })), _jsx("p", { className: "text-xs text-muted-foreground", children: "Contact your Param Wallet administrator to obtain a SuperApp ID." })] }) }), _jsx(FormDialog, { open: !!suspendTarget, onOpenChange: (o) => { if (!o)
                    setSuspendTarget(null); }, title: "Suspend SuperApp", description: `Are you sure you want to suspend "${suspendTarget?.name}"?`, onSubmit: handleSuspend, isLoading: suspending, submitLabel: "Suspend", destructive: true, children: _jsx("div", { className: "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive", children: "All users of this SuperApp will lose access until it is reactivated." }) })] }));
}
