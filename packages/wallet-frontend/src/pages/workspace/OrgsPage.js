import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const orgSchema = z.object({
    role: z.string().min(1, 'Role is required'),
    orgName: z.string().min(2, 'Organization name is required'),
    orgParamId: z.string().min(1, 'Param ID is required'),
    taxId: z.string().optional(),
    legalName: z.string().optional(),
    telephone: z.string().optional(),
    orgAdmin: z.string().optional(),
});
export function OrgsPage() {
    const { workspaceId, superAppId } = useParams();
    const { activeSuperApp } = useSuperAppStore();
    const qc = useQueryClient();
    const saId = superAppId ?? activeSuperApp?.paramId ?? '';
    const { data: orgs, isLoading } = useOrgs(workspaceId ?? '', saId);
    const onboardPartner = useOnboardPartner(workspaceId ?? '', saId);
    const [createOpen, setCreateOpen] = useState(false);
    const [suspendOrg, setSuspendOrg] = useState(null);
    const [suspending, setSuspending] = useState(false);
    const roles = activeSuperApp?.roles?.map((r) => r.name) ?? [];
    const form = useForm({ resolver: zodResolver(orgSchema) });
    const { register, setValue, watch, reset, formState: { errors } } = form;
    const handleCreate = async () => {
        const valid = await form.trigger();
        if (!valid)
            return;
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
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to onboard partner' });
        }
    };
    const handleSuspend = async () => {
        if (!suspendOrg)
            return;
        setSuspending(true);
        try {
            await updateOrgStatus(saId, suspendOrg.role, suspendOrg.org.paramId, 'suspended');
            await qc.invalidateQueries({ queryKey: workspaceKeys.orgs(workspaceId ?? '', saId) });
            toast({ title: 'Organization suspended' });
            setSuspendOrg(null);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to suspend organization' });
        }
        finally {
            setSuspending(false);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center p-12", children: _jsx(LoadingSpinner, {}) });
    return (_jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Organizations" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [orgs?.length ?? 0, " partner organizations"] })] }), _jsxs(Button, { size: "sm", onClick: () => { reset(); setCreateOpen(true); }, children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "Onboard Partner"] })] }), !orgs?.length ? (_jsx(EmptyState, { icon: Building2, title: "No organizations", description: "Onboard partner organizations to this SuperApp.", action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Onboard Partner" }) })) : (_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Organization" }), _jsx(TableHead, { children: "Role" }), _jsx(TableHead, { children: "Param ID" }), _jsx(TableHead, { children: "Admin" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: orgs.map((org) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsxs("div", { children: [_jsx("p", { className: "font-medium text-sm", children: org.org.name }), org.isSponsorOrg && (_jsx("span", { className: "text-xs text-primary font-medium", children: "Sponsor" }))] }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: org.role }) }), _jsx(TableCell, { className: "font-mono text-xs text-muted-foreground", children: org.org.paramId }), _jsx(TableCell, { className: "text-sm", children: org.orgAdmin ?? '—' }), _jsx(TableCell, { children: _jsx(Badge, { variant: org.status === 'active' ? 'success' : 'warning', children: org.status }) }), _jsx(TableCell, { className: "text-right", children: org.status === 'active' && !org.isSponsorOrg && (_jsxs(Button, { variant: "ghost", size: "sm", className: "text-destructive hover:text-destructive h-7 text-xs", onClick: () => setSuspendOrg(org), children: [_jsx(ShieldAlert, { className: "mr-1 h-3 w-3" }), "Suspend"] })) })] }, org._id))) })] }) })), _jsxs(FormDialog, { open: createOpen, onOpenChange: setCreateOpen, title: "Onboard Partner Organization", description: "Register a partner organization in this SuperApp.", onSubmit: handleCreate, isLoading: onboardPartner.isPending, submitLabel: "Onboard", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Role" }), _jsxs(Select, { value: watch('role') ?? '', onValueChange: (v) => setValue('role', v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select role" }) }), _jsx(SelectContent, { children: roles.length ? (roles.map((r) => _jsx(SelectItem, { value: r, children: r }, r))) : (_jsx(SelectItem, { value: "partner", children: "partner" })) })] }), errors.role && _jsx("p", { className: "text-xs text-destructive", children: errors.role.message })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Organization Name" }), _jsx(Input, { placeholder: "Acme Corp", ...register('orgName') }), errors.orgName && _jsx("p", { className: "text-xs text-destructive", children: errors.orgName.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Param ID" }), _jsx(Input, { placeholder: "PARAM_...", ...register('orgParamId') }), errors.orgParamId && _jsx("p", { className: "text-xs text-destructive", children: errors.orgParamId.message })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { children: ["Legal Name ", _jsx("span", { className: "text-muted-foreground", children: "(optional)" })] }), _jsx(Input, { placeholder: "Acme Corporation Pvt Ltd", ...register('legalName') })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { children: ["Tax ID ", _jsx("span", { className: "text-muted-foreground", children: "(optional)" })] }), _jsx(Input, { placeholder: "GSTIN / VAT", ...register('taxId') })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { children: ["Telephone ", _jsx("span", { className: "text-muted-foreground", children: "(optional)" })] }), _jsx(Input, { placeholder: "+91 XXXXX XXXXX", ...register('telephone') })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs(Label, { children: ["Org Admin Email ", _jsx("span", { className: "text-muted-foreground", children: "(optional)" })] }), _jsx(Input, { placeholder: "admin@acme.com", ...register('orgAdmin') })] })] })] }), _jsx(FormDialog, { open: !!suspendOrg, onOpenChange: (o) => { if (!o)
                    setSuspendOrg(null); }, title: "Suspend Organization", description: `Are you sure you want to suspend "${suspendOrg?.org.name}"? Their users will lose access.`, onSubmit: handleSuspend, isLoading: suspending, submitLabel: "Suspend", destructive: true, children: _jsx("div", { className: "rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive", children: "This action will suspend all access for this organization." }) })] }));
}
