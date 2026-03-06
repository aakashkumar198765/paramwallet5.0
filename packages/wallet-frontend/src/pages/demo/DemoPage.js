import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Play, StopCircle } from 'lucide-react';
import { useDemoStore } from '@/store/demo.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
export function DemoPage() {
    const { workspaceId, superAppId } = useParams();
    const { isDemoMode, demoRole, startDemo, endDemo } = useDemoStore();
    const { activeSuperApp } = useSuperAppStore();
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(demoRole ?? '');
    const roles = activeSuperApp?.roles?.map((r) => r.name) ?? [];
    const handleStart = () => {
        if (!selectedRole)
            return;
        startDemo(selectedRole);
        navigate(`/${workspaceId}/sa/${superAppId}/documents`);
    };
    return (_jsxs("div", { className: "p-6 max-w-lg space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(FlaskConical, { className: "h-6 w-6 text-primary" }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Demo Mode" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Preview the UI as a specific role without affecting real data." })] })] }), isDemoMode && (_jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3", children: [_jsx(Badge, { variant: "warning", children: "Demo Active" }), _jsxs("span", { className: "text-sm", children: ["Viewing as ", _jsx("strong", { children: demoRole })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "ml-auto gap-1", onClick: endDemo, children: [_jsx(StopCircle, { className: "h-4 w-4" }), "End Demo"] })] })), _jsxs("div", { className: "rounded-lg border p-4 space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Select role to preview" }), _jsxs(Select, { value: selectedRole, onValueChange: setSelectedRole, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Choose a role\u2026" }) }), _jsx(SelectContent, { children: roles.length ? (roles.map((role) => (_jsx(SelectItem, { value: role, children: role }, role)))) : (_jsx(SelectItem, { value: "viewer", children: "viewer" })) })] })] }), _jsxs(Button, { className: "w-full gap-2", disabled: !selectedRole, onClick: handleStart, children: [_jsx(Play, { className: "h-4 w-4" }), "Start Demo as ", selectedRole || '…'] })] }), _jsxs("div", { className: "text-xs text-muted-foreground space-y-1", children: [_jsx("p", { children: "\u2022 Demo mode applies RBAC filtering based on the selected role." }), _jsx("p", { children: "\u2022 All write operations use ParamGateway stubs \u2014 no real transactions." }), _jsx("p", { children: "\u2022 A banner will be shown while demo mode is active." })] })] }));
}
