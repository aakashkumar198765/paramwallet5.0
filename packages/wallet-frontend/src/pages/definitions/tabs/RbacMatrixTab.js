import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSuperAppDefs } from '@/hooks/use-definitions';
import { useRbacMatrix } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AccessBadge } from '@/components/shared/AccessBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
export function RbacMatrixTab({ ws }) {
    const [selectedSaId, setSelectedSaId] = useState('');
    const { data: superAppDefs, isLoading: loadingDefs } = useSuperAppDefs(ws);
    const { data: matrix, isLoading: loadingMatrix } = useRbacMatrix(ws, selectedSaId);
    if (loadingDefs)
        return _jsx("div", { className: "flex justify-center py-8", children: _jsx(LoadingSpinner, {}) });
    if (!superAppDefs?.length)
        return _jsx(EmptyState, { icon: ShieldCheck, title: "No SuperApp definitions found" });
    // Collect all unique role.team keys from matrix permissions
    const roleTeamKeys = matrix
        ? Array.from(new Set(matrix.permissions.flatMap((p) => Object.keys(p.access))))
        : [];
    return (_jsxs("div", { className: "space-y-4 mt-2", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs(Select, { value: selectedSaId, onValueChange: setSelectedSaId, children: [_jsx(SelectTrigger, { className: "w-64", children: _jsx(SelectValue, { placeholder: "Select SuperApp definition" }) }), _jsx(SelectContent, { children: superAppDefs.map((sa) => (_jsx(SelectItem, { value: sa._id, children: sa.name }, sa._id))) })] }) }), !selectedSaId ? (_jsx(EmptyState, { icon: ShieldCheck, title: "Select a SuperApp to view its RBAC matrix" })) : loadingMatrix ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(LoadingSpinner, {}) })) : !matrix ? (_jsx(EmptyState, { icon: ShieldCheck, title: "No RBAC matrix defined", description: "Create one to control state-level access." })) : (_jsx("div", { className: "rounded-md border overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "sticky left-0 bg-background", children: "State" }), _jsx(TableHead, { className: "sticky left-0 bg-background", children: "SubState" }), roleTeamKeys.map((key) => (_jsx(TableHead, { className: "text-xs whitespace-nowrap", children: key }, key)))] }) }), _jsx(TableBody, { children: matrix.permissions.map((perm, i) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-mono text-xs", children: perm.state }), _jsx(TableCell, { className: "font-mono text-xs text-muted-foreground", children: perm.subState ?? '—' }), roleTeamKeys.map((key) => (_jsx(TableCell, { children: _jsx(AccessBadge, { access: perm.access[key] ?? 'N/A' }) }, key)))] }, i))) })] }) }))] }));
}
