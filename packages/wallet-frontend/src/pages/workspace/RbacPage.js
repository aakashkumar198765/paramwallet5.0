import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Save, Plus, Trash2 } from 'lucide-react';
import { useRbacMatrix, useCreateRbacMatrix, useUpdateRbacMatrix } from '@/hooks/use-definitions';
import { useSuperAppStore } from '@/store/superapp.store';
import { useSMs } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
const ACCESS_CYCLE = ['N/A', 'RO', 'RW'];
function nextAccess(current) {
    const idx = ACCESS_CYCLE.indexOf(current);
    return ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length];
}
function MatrixEditor({ matrix, onSave, saving }) {
    const [permissions, setPermissions] = useState(matrix.permissions.map((p) => ({ ...p, access: { ...p.access } })));
    const [dirty, setDirty] = useState(false);
    const [newState, setNewState] = useState('');
    const [newSubState, setNewSubState] = useState('');
    const roleTeamKeys = Array.from(new Set(permissions.flatMap((p) => Object.keys(p.access))));
    const [newRoleTeam, setNewRoleTeam] = useState('');
    const toggleCell = useCallback((rowIdx, key) => {
        setPermissions((prev) => {
            const copy = prev.map((p, i) => i === rowIdx
                ? { ...p, access: { ...p.access, [key]: nextAccess(p.access[key] ?? 'N/A') } }
                : p);
            return copy;
        });
        setDirty(true);
    }, []);
    const addRow = () => {
        if (!newState.trim())
            return;
        setPermissions((prev) => [
            ...prev,
            {
                state: newState.trim(),
                subState: newSubState.trim() || null,
                microState: null,
                access: Object.fromEntries(roleTeamKeys.map((k) => [k, 'N/A'])),
            },
        ]);
        setNewState('');
        setNewSubState('');
        setDirty(true);
    };
    const removeRow = (idx) => {
        setPermissions((prev) => prev.filter((_, i) => i !== idx));
        setDirty(true);
    };
    const addColumn = () => {
        const key = newRoleTeam.trim();
        if (!key || roleTeamKeys.includes(key))
            return;
        setPermissions((prev) => prev.map((p) => ({ ...p, access: { ...p.access, [key]: 'N/A' } })));
        setNewRoleTeam('');
        setDirty(true);
    };
    const removeColumn = (key) => {
        setPermissions((prev) => prev.map((p) => {
            const { [key]: _removed, ...rest } = p.access;
            return { ...p, access: rest };
        }));
        setDirty(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["Click any cell to cycle: ", _jsx("strong", { children: "N/A \u2192 RO \u2192 RW \u2192 N/A" })] }), _jsxs(Button, { size: "sm", disabled: !dirty || saving, onClick: () => onSave(permissions).then(() => setDirty(false)), children: [saving ? _jsx(LoadingSpinner, { size: "sm", className: "mr-1.5" }) : _jsx(Save, { className: "mr-1.5 h-3.5 w-3.5" }), "Save Matrix"] })] }), _jsx("div", { className: "overflow-x-auto rounded-md border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/40", children: [_jsx("th", { className: "px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32 sticky left-0 bg-muted/40", children: "State" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32", children: "SubState" }), roleTeamKeys.map((key) => (_jsx("th", { className: "px-3 py-2 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap", children: _jsxs("div", { className: "flex items-center gap-1 justify-center", children: [key, _jsx("button", { className: "text-destructive/60 hover:text-destructive ml-1", onClick: () => removeColumn(key), title: `Remove column ${key}`, children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) }, key))), _jsx("th", { className: "px-3 py-2 text-xs font-semibold text-muted-foreground w-10", children: _jsx("span", { className: "sr-only", children: "Remove" }) })] }) }), _jsxs("tbody", { children: [permissions.map((perm, idx) => (_jsxs("tr", { className: "border-b hover:bg-muted/20 transition-colors", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs font-medium sticky left-0 bg-background", children: perm.state }), _jsx("td", { className: "px-3 py-2 font-mono text-xs text-muted-foreground", children: perm.subState ?? '—' }), roleTeamKeys.map((key) => (_jsx("td", { className: "px-3 py-2 text-center", children: _jsx("button", { onClick: () => toggleCell(idx, key), className: cn('rounded px-2 py-0.5 text-xs font-semibold transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1', perm.access[key] === 'RW' && 'bg-green-500/15 text-green-700 dark:text-green-400', perm.access[key] === 'RO' && 'bg-blue-500/15 text-blue-700 dark:text-blue-400', (!perm.access[key] || perm.access[key] === 'N/A') && 'bg-muted text-muted-foreground'), children: perm.access[key] ?? 'N/A' }) }, key))), _jsx("td", { className: "px-3 py-2 text-center", children: _jsx("button", { onClick: () => removeRow(idx), className: "text-destructive/60 hover:text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }) })] }, idx))), _jsxs("tr", { className: "border-b bg-muted/10", children: [_jsx("td", { className: "px-2 py-2", children: _jsx(Input, { placeholder: "state", value: newState, onChange: (e) => setNewState(e.target.value), className: "h-7 text-xs font-mono" }) }), _jsx("td", { className: "px-2 py-2", children: _jsx(Input, { placeholder: "subState (opt)", value: newSubState, onChange: (e) => setNewSubState(e.target.value), className: "h-7 text-xs font-mono" }) }), _jsx("td", { colSpan: roleTeamKeys.length + 1, className: "px-2 py-2", children: _jsxs(Button, { size: "sm", variant: "outline", className: "h-7 text-xs", onClick: addRow, disabled: !newState.trim(), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), "Add Row"] }) })] })] })] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { placeholder: "role.team (e.g. buyer.procurement)", value: newRoleTeam, onChange: (e) => setNewRoleTeam(e.target.value), className: "h-8 text-xs max-w-xs font-mono" }), _jsxs(Button, { size: "sm", variant: "outline", className: "h-8 text-xs", onClick: addColumn, disabled: !newRoleTeam.trim(), children: [_jsx(Plus, { className: "mr-1 h-3 w-3" }), "Add Column"] })] })] }));
}
export function RbacPage() {
    const { workspaceId, superAppId } = useParams();
    const { activeSuperApp } = useSuperAppStore();
    const saId = superAppId ?? activeSuperApp?.paramId ?? '';
    const { data: sms } = useSMs(workspaceId ?? '');
    const [selectedSmId, setSelectedSmId] = useState('');
    const smId = selectedSmId;
    const { data: matrix, isLoading } = useRbacMatrix(workspaceId ?? '', saId);
    const createMatrix = useCreateRbacMatrix(workspaceId ?? '', saId);
    const updateMatrix = useUpdateRbacMatrix(workspaceId ?? '', saId, smId);
    const linkedSMs = activeSuperApp?.linkedSMs ?? [];
    const availableSMs = sms?.filter((sm) => linkedSMs.includes(sm._id)) ?? [];
    const handleSave = async (permissions) => {
        try {
            if (matrix) {
                await updateMatrix.mutateAsync({ permissions });
            }
            else {
                const smName = availableSMs.find((s) => s._id === smId)?.name ?? smId;
                await createMatrix.mutateAsync({ superAppId: saId, smId, smName, permissions });
            }
            toast({ title: 'RBAC matrix saved' });
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to save matrix' });
            throw new Error('save failed');
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Team RBAC Matrix" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Define state-level access for each role \u00D7 team combination. Click a cell to cycle N/A \u2192 RO \u2192 RW." })] }), availableSMs.length > 0 && (_jsx("div", { className: "flex items-center gap-3", children: _jsxs(Select, { value: selectedSmId, onValueChange: setSelectedSmId, children: [_jsx(SelectTrigger, { className: "w-64", children: _jsx(SelectValue, { placeholder: "Select state machine" }) }), _jsx(SelectContent, { children: availableSMs.map((sm) => (_jsx(SelectItem, { value: sm._id, children: sm.name }, sm._id))) })] }) })), isLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(LoadingSpinner, {}) })) : !matrix ? (_jsx(EmptyState, { icon: ShieldCheck, title: "No RBAC matrix defined", description: "Create a matrix to control state-level access for each role and team.", action: _jsxs(Button, { onClick: () => handleSave([]), children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "Create Matrix"] }) })) : (_jsx(MatrixEditor, { matrix: matrix, onSave: handleSave, saving: createMatrix.isPending || updateMatrix.isPending }))] }));
}
