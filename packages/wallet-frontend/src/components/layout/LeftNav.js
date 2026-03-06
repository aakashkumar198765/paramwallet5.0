import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Layers, FileText, PlayCircle, Settings, Plus, ChevronDown, ChevronRight, } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { useDemoStore } from '@/store/demo.store';
function NavItem({ to, icon, label, end }) {
    return (_jsxs(NavLink, { to: to, end: end, className: ({ isActive }) => `p-sidebar-item${isActive ? ' active' : ''}`, children: [_jsx("span", { className: "p-sidebar-item-icon", children: icon }), _jsx("span", { className: "p-sidebar-item-label", children: label })] }));
}
export function LeftNav() {
    const { workspaceId } = useParams();
    const { workspaceList, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
    const { activeSuperApp } = useSuperAppStore();
    const { isDemoMode } = useDemoStore();
    const navigate = useNavigate();
    const [wsDropOpen, setWsDropOpen] = useState(false);
    const ws = workspaceId ?? activeWorkspace ?? '';
    const currentWs = workspaceList.find((w) => w.subdomain === ws);
    const handleSwitchWorkspace = (subdomain) => {
        setActiveWorkspace(subdomain);
        navigate(`/${subdomain}`);
        setWsDropOpen(false);
    };
    return (_jsxs("aside", { className: "p-sidebar", children: [_jsxs("div", { className: "p-sidebar-header", children: [_jsxs("button", { className: "p-sidebar-brand", onClick: () => setWsDropOpen((o) => !o), children: [_jsx("div", { className: "p-sidebar-avatar", children: (currentWs?.workspaceName ?? ws ?? 'W')[0]?.toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("p", { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }, className: "truncate", children: currentWs?.workspaceName ?? ws ?? 'Workspace' }), _jsx("p", { style: { fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }, className: "truncate", children: ws })] }), workspaceList.length > 1
                                ? _jsx(ChevronDown, { size: 12, style: { color: 'var(--text-tertiary)', flexShrink: 0 } })
                                : _jsx(ChevronRight, { size: 12, style: { color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 } })] }), wsDropOpen && workspaceList.length > 1 && (_jsx("div", { style: {
                            marginTop: 4, borderRadius: 8, overflow: 'hidden',
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-surface)',
                            boxShadow: 'var(--shadow-md)',
                        }, children: workspaceList.map((w) => (_jsxs("button", { onClick: () => handleSwitchWorkspace(w.subdomain), style: {
                                width: '100%', textAlign: 'left', padding: '8px 12px',
                                border: 'none', cursor: 'pointer',
                                background: w.subdomain === ws ? 'var(--bg-selected)' : 'none',
                                transition: 'background 0.15s',
                                display: 'block',
                            }, onMouseOver: e => (e.currentTarget.style.background = 'var(--bg-hover)'), onMouseOut: e => (e.currentTarget.style.background = w.subdomain === ws ? 'var(--bg-selected)' : 'none'), children: [_jsx("p", { style: { fontSize: 12, fontWeight: w.subdomain === ws ? 600 : 400, color: w.subdomain === ws ? 'var(--text-accent)' : 'var(--text-primary)', margin: 0 }, children: w.workspaceName }), _jsx("p", { style: { fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }, children: w.subdomain })] }, w.subdomain))) }))] }), ws && (_jsxs("div", { className: "p-sidebar-nav", children: [_jsx("div", { className: "p-sidebar-section-label", children: "Workspace" }), _jsx(NavItem, { to: `/${ws}`, end: true, icon: _jsx(LayoutDashboard, { size: 14 }), label: "Overview" }), _jsx(NavItem, { to: `/${ws}/superapps`, icon: _jsx(Layers, { size: 14 }), label: "SuperApps" })] })), activeSuperApp && ws && (_jsxs("div", { className: "p-sidebar-nav", style: { marginTop: 4 }, children: [_jsxs("div", { className: "p-sidebar-section-label", style: { display: 'flex', alignItems: 'center', gap: 5 }, children: [_jsx("span", { style: {
                                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                    background: 'var(--bg-primary)',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 8, fontWeight: 700, color: '#fff',
                                }, children: activeSuperApp.name[0]?.toUpperCase() }), _jsx("span", { className: "truncate", children: activeSuperApp.name })] }), _jsx(NavItem, { to: `/${ws}/sa/${activeSuperApp.paramId}/documents`, icon: _jsx(FileText, { size: 14 }), label: "Documents" }), _jsx(NavItem, { to: `/${ws}/sa/${activeSuperApp.paramId}/demo`, icon: _jsx(PlayCircle, { size: 14 }), label: "Demo Mode" })] })), isDemoMode && (_jsx("div", { style: {
                    margin: '8px 10px',
                    padding: '6px 10px',
                    borderRadius: 7,
                    background: 'var(--bg-warning-subtle)',
                    border: '1px solid var(--bg-warning)',
                }, children: _jsx("p", { style: { fontSize: 10, fontWeight: 600, color: 'var(--text-warning)', margin: 0 }, children: "\uD83C\uDFAD Demo Mode Active" }) })), _jsx("div", { style: { flex: 1 } }), ws && (_jsx("div", { className: "p-sidebar-nav", style: { paddingBottom: 4 }, children: _jsx(NavItem, { to: `/${ws}/settings`, icon: _jsx(Settings, { size: 14 }), label: "Settings" }) })), _jsx("div", { className: "p-sidebar-footer", children: _jsxs("button", { onClick: () => navigate('/workspace/create'), className: "p-sidebar-user", style: { background: 'none', border: 'none', cursor: 'pointer', width: '100%' }, children: [_jsx("div", { style: {
                                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                                border: '1px dashed var(--border-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }, children: _jsx(Plus, { size: 12, style: { color: 'var(--text-tertiary)' } }) }), _jsx("span", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: "New Workspace" })] }) })] }));
}
