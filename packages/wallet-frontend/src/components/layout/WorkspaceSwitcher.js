import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { useWorkspaceStore } from '@/store/workspace.store';
import { truncate } from '@/lib/utils';
export function WorkspaceSwitcher() {
    const { activeWorkspace, workspaceList, setActiveWorkspace } = useWorkspaceStore();
    const navigate = useNavigate();
    const active = workspaceList.find((w) => w.subdomain === activeWorkspace);
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs("button", { className: "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors", children: [_jsx("div", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold", children: active?.workspaceName?.[0]?.toUpperCase() ?? 'W' }), _jsx("span", { className: "flex-1 text-left truncate", children: active ? truncate(active.workspaceName, 20) : 'Select workspace' }), _jsx(ChevronsUpDown, { className: "h-4 w-4 shrink-0 text-muted-foreground" })] }) }), _jsxs(DropdownMenuContent, { className: "w-56", align: "start", children: [_jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground", children: "Workspaces" }), _jsx(DropdownMenuSeparator, {}), workspaceList.map((ws) => (_jsxs(DropdownMenuItem, { onClick: () => setActiveWorkspace(ws.subdomain), className: "gap-2", children: [_jsx("div", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-primary text-xs font-bold", children: ws.workspaceName[0].toUpperCase() }), _jsx("span", { className: "truncate", children: ws.workspaceName }), activeWorkspace === ws.subdomain && (_jsx("span", { className: "ml-auto text-xs text-muted-foreground", children: "active" }))] }, ws._id))), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: () => navigate('/workspace/create'), className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), "Create workspace"] })] })] }));
}
