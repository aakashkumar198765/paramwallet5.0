import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import { useSuperAppStore } from '@/store/superapp.store';
import { useSMs, useSchema } from '@/hooks/use-definitions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createDocument } from '@/api/paramgateway/stubs';
import { toast } from '@/hooks/use-toast';
import { flattenSchema, fieldLabel, getFieldType } from '@/lib/schema';
export function DocumentCreate() {
    const { workspaceId, superAppId } = useParams();
    const { activeSuperApp } = useSuperAppStore();
    const navigate = useNavigate();
    const [selectedSmId, setSelectedSmId] = useState('');
    const [selectedSchemaId, setSelectedSchemaId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { data: sms, isLoading: loadingSMs } = useSMs(workspaceId ?? '');
    const { data: schema, isLoading: loadingSchema } = useSchema(workspaceId ?? '', selectedSchemaId);
    const { register, handleSubmit, setValue } = useForm();
    const linkedSMs = activeSuperApp?.linkedSMs ?? [];
    const availableSMs = sms?.filter((sm) => linkedSMs.includes(sm._id)) ?? [];
    const selectedSM = sms?.find((sm) => sm._id === selectedSmId);
    const startState = selectedSM?.startAt ?? '';
    const startStateDef = selectedSM?.states[startState];
    const startSchemaId = startStateDef?.schema ?? '';
    // Auto-select schema when SM changes
    const fields = schema ? flattenSchema(schema) : [];
    const onSubmit = async (data) => {
        if (!selectedSmId || !startState) {
            toast({ variant: 'destructive', title: 'Select a State Machine first' });
            return;
        }
        setSubmitting(true);
        try {
            await createDocument(selectedSmId, {
                smId: selectedSmId,
                roles: {},
                stateTo: startState,
                subStateTo: null,
                data,
            });
            toast({ title: 'Document creation submitted' });
            navigate(`/${workspaceId}/sa/${superAppId}/documents`);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to create document' });
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center gap-3 border-b px-6 py-4", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => navigate(-1), children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsx("h1", { className: "text-lg font-semibold", children: "New Document" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "max-w-lg space-y-6", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "State Machine" }), loadingSMs ? (_jsx(LoadingSpinner, { size: "sm" })) : (_jsxs(Select, { value: selectedSmId, onValueChange: (v) => {
                                        setSelectedSmId(v);
                                        setSelectedSchemaId('');
                                    }, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select state machine" }) }), _jsx(SelectContent, { children: availableSMs.map((sm) => (_jsx(SelectItem, { value: sm._id, children: sm.name }, sm._id))) })] }))] }), startState && (_jsxs("div", { className: "rounded-md border bg-muted/30 px-4 py-3 text-sm", children: [_jsx("span", { className: "text-muted-foreground", children: "Start state: " }), _jsx("span", { className: "font-mono font-medium", children: startState }), startSchemaId && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-muted-foreground ml-4", children: "Schema: " }), _jsx("span", { className: "font-mono font-medium", children: startSchemaId })] }))] })), loadingSchema && _jsx(LoadingSpinner, { size: "sm" }), fields.map((field) => {
                            const type = getFieldType(field.prop);
                            const label = fieldLabel(field.key, field.prop);
                            if (type === 'boolean') {
                                return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { htmlFor: field.key, children: label }), _jsx(Switch, { id: field.key, onCheckedChange: (checked) => setValue(field.key, checked) })] }, field.key));
                            }
                            if (type === 'enum' && field.prop.enum) {
                                return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: field.key, children: label }), _jsxs(Select, { onValueChange: (v) => setValue(field.key, v), children: [_jsx(SelectTrigger, { id: field.key, children: _jsx(SelectValue, { placeholder: `Select ${label}` }) }), _jsx(SelectContent, { children: field.prop.enum.map((opt) => (_jsx(SelectItem, { value: opt, children: opt }, opt))) })] })] }, field.key));
                            }
                            return (_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: field.key, children: label }), _jsx(Input, { id: field.key, type: type === 'number' ? 'number' : 'text', ...register(field.key) })] }, field.key));
                        }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx(Button, { type: "submit", disabled: submitting || !selectedSmId, children: submitting ? 'Submitting…' : 'Create Document' }), _jsx(Button, { type: "button", variant: "outline", onClick: () => navigate(-1), children: "Cancel" })] })] }) })] }));
}
