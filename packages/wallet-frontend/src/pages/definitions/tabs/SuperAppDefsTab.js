import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Eye } from 'lucide-react';
import { useSuperAppDefs, useCreateSuperAppDef } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
const defSchema = z.object({
    name: z.string().min(2, 'Name required'),
    desc: z.string().min(2, 'Description required'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use semver e.g. 1.0.0'),
    sponsor: z.string().min(1, 'Sponsor Param ID required'),
});
export function SuperAppDefsTab({ ws }) {
    const { data: defs, isLoading } = useSuperAppDefs(ws);
    const createDef = useCreateSuperAppDef(ws);
    const [createOpen, setCreateOpen] = useState(false);
    const [viewDef, setViewDef] = useState(null);
    const form = useForm({ resolver: zodResolver(defSchema) });
    const { register, reset, formState: { errors } } = form;
    const handleCreate = async () => {
        const valid = await form.trigger();
        if (!valid)
            return;
        const data = form.getValues();
        try {
            await createDef.mutateAsync({ ...data, roles: [], linkedSMs: [], isActive: 1 });
            toast({ title: 'SuperApp definition created', description: data.name });
            reset();
            setCreateOpen(false);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to create definition' });
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center py-8", children: _jsx(LoadingSpinner, {}) });
    return (_jsxs("div", { className: "space-y-3 mt-2", children: [_jsx("div", { className: "flex justify-end", children: _jsxs(Button, { size: "sm", onClick: () => { reset(); setCreateOpen(true); }, children: [_jsx(Plus, { className: "mr-1.5 h-3.5 w-3.5" }), "New SuperApp Def"] }) }), !defs?.length ? (_jsx(EmptyState, { icon: BookOpen, title: "No SuperApp definitions", action: _jsx(Button, { size: "sm", onClick: () => setCreateOpen(true), children: "Create First" }) })) : (_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Version" }), _jsx(TableHead, { children: "Roles" }), _jsx(TableHead, { children: "Linked SMs" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: defs.map((def) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: def.name }), _jsx(TableCell, { className: "font-mono text-xs", children: def.version }), _jsx(TableCell, { children: def.roles.length }), _jsx(TableCell, { children: def.linkedSMs.length }), _jsx(TableCell, { className: "text-xs text-muted-foreground", children: formatDate(def.createdAt) }), _jsx(TableCell, { children: _jsx(Badge, { variant: def.isActive ? 'success' : 'secondary', children: def.isActive ? 'active' : 'inactive' }) }), _jsx(TableCell, { className: "text-right", children: _jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs gap-1", onClick: () => setViewDef(def), children: [_jsx(Eye, { className: "h-3 w-3" }), "View"] }) })] }, def._id))) })] }) })), _jsxs(FormDialog, { open: createOpen, onOpenChange: setCreateOpen, title: "New SuperApp Definition", description: "Define a new SuperApp for deployment.", onSubmit: handleCreate, isLoading: createDef.isPending, submitLabel: "Create", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Name" }), _jsx(Input, { placeholder: "Trade Finance", ...register('name') }), errors.name && _jsx("p", { className: "text-xs text-destructive", children: errors.name.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Version" }), _jsx(Input, { placeholder: "1.0.0", ...register('version') }), errors.version && _jsx("p", { className: "text-xs text-destructive", children: errors.version.message })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Description" }), _jsx(Input, { placeholder: "Describe this SuperApp", ...register('desc') }), errors.desc && _jsx("p", { className: "text-xs text-destructive", children: errors.desc.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Sponsor Param ID" }), _jsx(Input, { placeholder: "PARAM_...", ...register('sponsor') }), errors.sponsor && _jsx("p", { className: "text-xs text-destructive", children: errors.sponsor.message })] })] }), _jsx(Dialog, { open: !!viewDef, onOpenChange: (o) => { if (!o)
                    setViewDef(null); }, children: _jsxs(DialogContent, { className: "sm:max-w-2xl", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: [viewDef?.name, " ", _jsxs("span", { className: "text-muted-foreground font-normal", children: ["v", viewDef?.version] })] }) }), viewDef && _jsx(JsonViewer, { data: viewDef })] }) })] }));
}
