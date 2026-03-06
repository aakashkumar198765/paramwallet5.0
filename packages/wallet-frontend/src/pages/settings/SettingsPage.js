import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { useTheme } from '@/hooks/use-theme';
import { updateWorkspace } from '@/api/workspace.api';
import { useQueryClient } from '@tanstack/react-query';
import { workspaceKeys } from '@/hooks/use-workspace';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormDialog } from '@/components/shared/FormDialog';
import { toast } from '@/hooks/use-toast';
import { PlantsPage } from '@/pages/workspace/PlantsPage';
import { UsersPage } from '@/pages/workspace/UsersPage';
import { OrgsPage } from '@/pages/workspace/OrgsPage';
import { RbacPage } from '@/pages/workspace/RbacPage';
const wsSchema = z.object({ workspaceName: z.string().min(2, 'Name must be at least 2 chars') });
const TABS = [
    { value: 'workspace', label: 'Workspace' },
    { value: 'profile', label: 'Profile' },
    { value: 'plants', label: 'Plants' },
    { value: 'users', label: 'Users' },
    { value: 'orgs', label: 'Organizations' },
    { value: 'rbac', label: 'RBAC' },
    { value: 'appearance', label: 'Appearance' },
];
export function SettingsPage() {
    const { workspaceId } = useParams();
    const { name, email, paramId } = useAuthStore();
    const { activeWorkspace, workspaceList, setWorkspaceList } = useWorkspaceStore();
    const { activeSuperApp } = useSuperAppStore();
    const { theme, toggleTheme } = useTheme();
    const qc = useQueryClient();
    const [tab, setTab] = useState('workspace');
    const [renameOpen, setRenameOpen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const ws = workspaceList.find((w) => w.subdomain === (workspaceId ?? activeWorkspace));
    const form = useForm({
        resolver: zodResolver(wsSchema),
        defaultValues: { workspaceName: ws?.workspaceName ?? '' },
    });
    const { register, reset, formState: { errors } } = form;
    const handleRename = async () => {
        const valid = await form.trigger();
        if (!valid)
            return;
        setRenaming(true);
        try {
            const { workspaceName } = form.getValues();
            const updated = await updateWorkspace({ workspaceName });
            setWorkspaceList(workspaceList.map((w) => w.subdomain === ws?.subdomain ? { ...w, workspaceName: updated.workspaceName } : w));
            await qc.invalidateQueries({ queryKey: workspaceKeys.list() });
            toast({ title: 'Workspace renamed', description: updated.workspaceName });
            setRenameOpen(false);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to rename workspace' });
        }
        finally {
            setRenaming(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { className: "p-toolbar", children: [_jsx("h1", { className: "p-page-title", style: { fontSize: 15 }, children: "Settings" }), activeSuperApp && (_jsx("span", { className: "p-badge p-badge-primary ml-2", children: activeSuperApp.name }))] }), _jsx("div", { className: "p-subtabs", children: TABS.map((t) => (_jsx("button", { className: `p-subtab${tab === t.value ? ' active' : ''}`, onClick: () => setTab(t.value), children: t.label }, t.value))) }), _jsxs("div", { style: { flex: 1, overflowY: 'auto' }, children: [tab === 'workspace' && (_jsxs("div", { className: "p-page", style: { maxWidth: 560 }, children: [_jsx("p", { className: "p-section-title", style: { marginBottom: 12 }, children: "Workspace Details" }), _jsxs("div", { className: "p-card", style: { overflow: 'hidden' }, children: [_jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Name" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }, children: ws?.workspaceName ?? '—' }), ws && (_jsx(Button, { variant: "ghost", size: "icon", style: { width: 24, height: 24 }, onClick: () => { reset({ workspaceName: ws.workspaceName }); setRenameOpen(true); }, children: _jsx(Pencil, { style: { width: 11, height: 11 } }) }))] })] }), _jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Subdomain" }), _jsx("span", { className: "p-tag", children: ws?.subdomain ?? '—' })] }), _jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Owner Param ID" }), _jsx("span", { className: "p-tag", style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }, children: ws?.ownerParamId ?? '—' })] }), _jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Status" }), _jsx("span", { className: `p-badge ${ws?.status === 'active' ? 'p-badge-success' : 'p-badge-warning'}`, children: ws?.status ?? '—' })] })] }), _jsx(FormDialog, { open: renameOpen, onOpenChange: setRenameOpen, title: "Rename Workspace", description: "Update the display name of your workspace.", onSubmit: handleRename, isLoading: renaming, submitLabel: "Rename", children: _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Workspace Name" }), _jsx(Input, { placeholder: "My Workspace", ...register('workspaceName') }), errors.workspaceName && _jsx("p", { className: "text-xs text-destructive", children: errors.workspaceName.message })] }) })] })), tab === 'profile' && (_jsxs("div", { className: "p-page", style: { maxWidth: 560 }, children: [_jsx("p", { className: "p-section-title", style: { marginBottom: 12 }, children: "Account Information" }), _jsxs("div", { className: "p-card", style: { overflow: 'hidden' }, children: [_jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Name" }), _jsx("span", { style: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }, children: name ?? '—' })] }), _jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-secondary)' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Email" }), _jsx("span", { style: { fontSize: 12, color: 'var(--text-primary)' }, children: email ?? '—' })] }), _jsxs("div", { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "Param ID" }), _jsx("span", { className: "p-tag", style: { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }, children: paramId ?? '—' })] })] })] })), tab === 'plants' && _jsx(PlantsPage, {}), tab === 'users' && (activeSuperApp
                        ? _jsx(UsersPage, {})
                        : (_jsxs("div", { className: "p-empty", children: [_jsx("p", { className: "p-empty-title", children: "No SuperApp selected" }), _jsx("p", { className: "p-empty-desc", children: "Open a SuperApp from the SuperApps page to manage its users here." })] }))), tab === 'orgs' && (activeSuperApp
                        ? _jsx(OrgsPage, {})
                        : (_jsxs("div", { className: "p-empty", children: [_jsx("p", { className: "p-empty-title", children: "No SuperApp selected" }), _jsx("p", { className: "p-empty-desc", children: "Open a SuperApp to manage its partner organizations here." })] }))), tab === 'rbac' && (activeSuperApp
                        ? _jsx(RbacPage, {})
                        : (_jsxs("div", { className: "p-empty", children: [_jsx("p", { className: "p-empty-title", children: "No SuperApp selected" }), _jsx("p", { className: "p-empty-desc", children: "Open a SuperApp to manage its RBAC matrix here." })] }))), tab === 'appearance' && (_jsxs("div", { className: "p-page", style: { maxWidth: 560 }, children: [_jsx("p", { className: "p-section-title", style: { marginBottom: 12 }, children: "Display" }), _jsxs("div", { className: "p-card", style: { padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "dark-mode", style: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }, children: "Dark mode" }), _jsx("p", { style: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }, children: "Toggle between light and dark theme" })] }), _jsx(Switch, { id: "dark-mode", checked: theme === 'dark', onCheckedChange: toggleTheme })] })] }))] })] }));
}
