import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { usePlants, useCreatePlant } from '@/hooks/use-workspace';
import { updatePlant, deletePlant } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FormDialog } from '@/components/shared/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
const plantSchema = z.object({
    code: z.string().min(1, 'Code is required').max(20, 'Max 20 chars'),
    name: z.string().min(2, 'Name is required'),
    isActive: z.boolean().default(true),
});
export function PlantsPage() {
    const { workspaceId } = useParams();
    const qc = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [editPlant, setEditPlant] = useState(null);
    const [deletingCode, setDeletingCode] = useState(null);
    const { data: plants, isLoading } = usePlants(workspaceId ?? '');
    const createPlant = useCreatePlant(workspaceId ?? '');
    const createForm = useForm({ resolver: zodResolver(plantSchema), defaultValues: { isActive: true } });
    const editForm = useForm({ resolver: zodResolver(plantSchema) });
    const handleCreate = async () => {
        const valid = await createForm.trigger();
        if (!valid)
            return;
        const data = createForm.getValues();
        try {
            await createPlant.mutateAsync(data);
            toast({ title: 'Plant created', description: data.name });
            createForm.reset();
            setCreateOpen(false);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to create plant' });
        }
    };
    const openEdit = (plant) => {
        setEditPlant(plant);
        editForm.reset({ code: plant.code, name: plant.name, isActive: plant.isActive });
    };
    const handleEdit = async () => {
        if (!editPlant)
            return;
        const valid = await editForm.trigger();
        if (!valid)
            return;
        const data = editForm.getValues();
        try {
            await updatePlant(editPlant.code, { name: data.name, isActive: data.isActive });
            await qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceId ?? '') });
            toast({ title: 'Plant updated' });
            setEditPlant(null);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to update plant' });
        }
    };
    const handleDelete = async (code) => {
        setDeletingCode(code);
        try {
            await deletePlant(code);
            await qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceId ?? '') });
            toast({ title: 'Plant deleted' });
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to delete plant' });
        }
        finally {
            setDeletingCode(null);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center p-12", children: _jsx(LoadingSpinner, {}) });
    return (_jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Plants" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: [plants?.length ?? 0, " plants configured"] })] }), _jsxs(Button, { size: "sm", onClick: () => { createForm.reset({ isActive: true }); setCreateOpen(true); }, children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "Add Plant"] })] }), !plants?.length ? (_jsx(EmptyState, { icon: MapPin, title: "No plants configured", description: "Add plants to associate with organizations and teams.", action: _jsx(Button, { onClick: () => setCreateOpen(true), children: "Add Plant" }) })) : (_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Code" }), _jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Param ID" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: plants.map((plant) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-mono text-xs font-semibold", children: plant.code }), _jsx(TableCell, { className: "font-medium", children: plant.name }), _jsx(TableCell, { className: "font-mono text-xs text-muted-foreground", children: plant.paramId || '—' }), _jsx(TableCell, { children: _jsx(Badge, { variant: plant.isActive ? 'success' : 'secondary', children: plant.isActive ? 'Active' : 'Inactive' }) }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => openEdit(plant), children: _jsx(Pencil, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-destructive hover:text-destructive", onClick: () => handleDelete(plant.code), disabled: deletingCode === plant.code, children: deletingCode === plant.code
                                                        ? _jsx(LoadingSpinner, { size: "sm" })
                                                        : _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, plant._id))) })] }) })), _jsx(FormDialog, { open: createOpen, onOpenChange: setCreateOpen, title: "Add Plant", description: "Create a new plant location for your workspace.", onSubmit: handleCreate, isLoading: createPlant.isPending, submitLabel: "Add Plant", children: _jsx(PlantFormFields, { form: createForm, disableCode: false }) }), _jsx(FormDialog, { open: !!editPlant, onOpenChange: (o) => { if (!o)
                    setEditPlant(null); }, title: "Edit Plant", description: `Editing plant: ${editPlant?.code}`, onSubmit: handleEdit, submitLabel: "Save Changes", children: _jsx(PlantFormFields, { form: editForm, disableCode: true }) })] }));
}
function PlantFormFields({ form, disableCode }) {
    const { register, watch, setValue, formState: { errors } } = form;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "plant-code", children: "Plant Code" }), _jsx(Input, { id: "plant-code", placeholder: "PLT001", disabled: disableCode, ...register('code') }), errors.code && _jsx("p", { className: "text-xs text-destructive", children: errors.code.message })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "plant-name", children: "Plant Name" }), _jsx(Input, { id: "plant-name", placeholder: "Mumbai North Plant", ...register('name') }), errors.name && _jsx("p", { className: "text-xs text-destructive", children: errors.name.message })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: "plant-active", children: "Active" }), _jsx(Switch, { id: "plant-active", checked: watch('isActive'), onCheckedChange: (v) => setValue('isActive', v) })] })] }));
}
