import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Layers, Plus, ArrowRight } from 'lucide-react';
import { useWorkspaces } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppDefs } from '@/hooks/use-definitions';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
/** Section: Workspace cards */
function WorkspacesSection({ workspaces, onSelect, onCreateNew }) {
    return (_jsxs("section", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }, children: "Your Workspaces" }), _jsxs("p", { style: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }, children: [workspaces.length, " workspace", workspaces.length !== 1 ? 's' : '', " available"] })] }), _jsxs("button", { onClick: onCreateNew, style: {
                            display: 'flex', alignItems: 'center', gap: 5,
                            border: '1px solid var(--border-primary)',
                            background: 'none', borderRadius: 7, padding: '6px 12px',
                            cursor: 'pointer', fontSize: 12, fontWeight: 500,
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s',
                        }, onMouseOver: e => (e.currentTarget.style.background = 'var(--bg-hover)'), onMouseOut: e => (e.currentTarget.style.background = 'none'), children: [_jsx(Plus, { size: 13 }), " New workspace"] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }, children: workspaces.map((ws) => (_jsxs("button", { onClick: () => onSelect(ws.subdomain), style: {
                        display: 'flex', flexDirection: 'column', gap: 12,
                        textAlign: 'left', padding: 16,
                        border: '1px solid var(--border-primary)',
                        borderRadius: 10, background: 'var(--bg-surface)',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }, className: "p-ws-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: {
                                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                        background: 'var(--bg-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: 14, color: '#fff',
                                    }, children: ws.workspaceName[0]?.toUpperCase() }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("p", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }, className: "truncate", children: ws.workspaceName }), _jsx("p", { style: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }, className: "p-tag truncate", children: ws.subdomain })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { className: `p-badge${ws.status === 'active' ? ' --success' : ' --default'}`, style: { fontSize: 10 }, children: ws.status ?? 'active' }), _jsx(ArrowRight, { size: 13, style: { color: 'var(--text-tertiary)' } })] })] }, ws._id))) })] }));
}
/** Section: SuperApp Definitions catalog */
function DefinitionsSection({ ws }) {
    const { data: defs, isLoading } = useSuperAppDefs(ws);
    return (_jsxs("section", { children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("h2", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }, children: "SuperApp Catalog" }), _jsx("p", { style: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }, children: "Available application definitions for this workspace" })] }), isLoading ? (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '24px 0' }, children: _jsx(FullPageSpinner, {}) })) : !defs?.length ? (_jsxs("div", { style: {
                    border: '1px dashed var(--border-primary)',
                    borderRadius: 10, padding: 32, textAlign: 'center',
                    color: 'var(--text-tertiary)', fontSize: 13,
                }, children: [_jsx(Layers, { size: 24, style: { margin: '0 auto 8px', opacity: 0.4 } }), _jsx("p", { style: { margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }, children: "No SuperApp definitions yet" }), _jsx("p", { style: { margin: '4px 0 0', fontSize: 12 }, children: "Create definitions from the Definitions hub." })] })) : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }, children: defs.map((def) => (_jsxs("div", { style: {
                        padding: 16,
                        border: '1px solid var(--border-primary)',
                        borderRadius: 10, background: 'var(--bg-surface)',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }, children: [_jsx("div", { style: {
                                        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                                        background: 'var(--bg-primary-subtle)',
                                        border: '1px solid var(--border-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }, children: _jsx(Layers, { size: 14, style: { color: 'var(--text-accent)' } }) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("p", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }, className: "truncate", children: def.name }), _jsxs("p", { style: { fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }, children: ["v", def.version] })] })] }), def.desc && (_jsx("p", { style: { fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }, className: "line-clamp-2", children: def.desc })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { className: `p-badge${def.isActive ? ' --success' : ' --default'}`, style: { fontSize: 10 }, children: def.isActive ? 'active' : 'inactive' }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-quaternary)' }, children: [def.roles.length, " role", def.roles.length !== 1 ? 's' : ''] })] })] }, def._id))) }))] }));
}
export function PostLogin() {
    const { data: workspaces, isLoading } = useWorkspaces();
    const { setWorkspaceList, setActiveWorkspace } = useWorkspaceStore();
    const navigate = useNavigate();
    useEffect(() => {
        if (!workspaces)
            return;
        setWorkspaceList(workspaces);
        if (workspaces.length === 1) {
            setActiveWorkspace(workspaces[0].subdomain);
            navigate(`/${workspaces[0].subdomain}`);
        }
    }, [workspaces, setWorkspaceList, setActiveWorkspace, navigate]);
    if (isLoading)
        return _jsx(FullPageSpinner, {});
    if (!workspaces?.length) {
        return (_jsx("div", { style: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }, children: _jsx(EmptyState, { icon: Building2, title: "No workspaces yet", description: "Create your first workspace to get started.", action: _jsx(Button, { onClick: () => navigate('/workspace/create'), children: "Create Workspace" }) }) }));
    }
    const handleSelect = (subdomain) => {
        setActiveWorkspace(subdomain);
        navigate(`/${subdomain}`);
    };
    const activeWs = workspaces[0].subdomain;
    return (_jsxs("div", { style: { minHeight: '100vh', background: 'var(--bg-root)' }, children: [_jsx("header", { style: {
                    height: 56, display: 'flex', alignItems: 'center',
                    padding: '0 32px',
                    borderBottom: '1px solid var(--border-primary)',
                    background: 'var(--bg-surface)',
                }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: {
                                width: 28, height: 28, borderRadius: 8,
                                background: 'var(--bg-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 12, color: '#fff',
                            }, children: "P" }), _jsx("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }, children: "Param Console" })] }) }), _jsxs("div", { style: { maxWidth: 960, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 40 }, children: [_jsxs("div", { children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }, children: "Welcome back" }), _jsx("p", { style: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }, children: "Select a workspace to continue, or explore the SuperApp catalog." })] }), _jsx(WorkspacesSection, { workspaces: workspaces, onSelect: handleSelect, onCreateNew: () => navigate('/workspace/create') }), _jsx("div", { style: { height: 1, background: 'var(--border-primary)' } }), _jsx(DefinitionsSection, { ws: activeWs })] })] }));
}
