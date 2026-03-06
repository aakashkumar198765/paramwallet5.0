import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { Layers, FileText, Zap, Activity, ArrowRight, Plus } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useInstalledSuperApps } from '@/hooks/use-workspace';
import { useSuperAppStore } from '@/store/superapp.store';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
export function WorkspaceOverview() {
    const { workspaceId } = useParams();
    const { workspaceList } = useWorkspaceStore();
    const { setActiveSuperApp } = useSuperAppStore();
    const navigate = useNavigate();
    const ws = workspaceList.find((w) => w.subdomain === workspaceId);
    const { data: superApps, isLoading } = useInstalledSuperApps(workspaceId ?? '');
    const activeCount = superApps?.filter((s) => s.status === 'active').length ?? 0;
    const totalCount = superApps?.length ?? 0;
    return (_jsxs("div", { style: { padding: '28px 32px', maxWidth: 1100 }, children: [_jsxs("div", { className: "p-page-header", children: [_jsx("div", { className: "p-page-header-left", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: {
                                        width: 36, height: 36, borderRadius: 9,
                                        background: 'var(--bg-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0,
                                    }, children: (ws?.workspaceName ?? workspaceId ?? 'W')[0]?.toUpperCase() }), _jsxs("div", { children: [_jsx("h1", { style: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }, children: ws?.workspaceName ?? workspaceId }), _jsx("p", { className: "p-tag", style: { fontSize: 11, marginTop: 2 }, children: ws?.subdomain })] })] }) }), _jsxs("button", { onClick: () => navigate(`/${workspaceId}/superapps`), style: {
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 7,
                            background: 'var(--bg-primary)', color: '#fff',
                            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }, children: [_jsx(Plus, { size: 13 }), " Install SuperApp"] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24, marginBottom: 28 }, children: [
                    { label: 'Total SuperApps', value: totalCount, icon: Layers, variant: '--primary' },
                    { label: 'Active', value: activeCount, icon: Activity, variant: '--success' },
                    { label: 'Documents', value: '—', icon: FileText, variant: '--info' },
                    { label: 'Status', value: ws?.status ?? 'active', icon: Zap, variant: '--success' },
                ].map(({ label, value, icon: Icon, variant }) => (_jsxs("div", { className: "p-kpi-card", children: [_jsxs("div", { className: "p-kpi-header", children: [_jsx("span", { className: "p-kpi-label", children: label }), _jsx("div", { className: `p-kpi-icon ${variant}`, children: _jsx(Icon, { size: 16 }) })] }), _jsx("div", { className: "p-kpi-value", children: value })] }, label))) }), _jsxs("div", { style: { marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("h2", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }, children: "Installed SuperApps" }), _jsxs("button", { onClick: () => navigate(`/${workspaceId}/superapps`), style: {
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: 'var(--text-accent)',
                        }, children: ["Manage ", _jsx(ArrowRight, { size: 12 })] })] }), isLoading ? (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '40px 0' }, children: _jsx(LoadingSpinner, {}) })) : !superApps?.length ? (_jsx(EmptyState, { icon: Layers, title: "No SuperApps installed", description: "Install a SuperApp from the catalog to start managing documents.", action: _jsx("button", { onClick: () => navigate(`/${workspaceId}/superapps`), style: {
                        padding: '8px 16px', borderRadius: 7,
                        background: 'var(--bg-primary)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }, children: "Install SuperApp" }) })) : (_jsx("div", { className: "p-table-wrap", children: _jsxs("table", { className: "p-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Version" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Description" }), _jsx("th", {})] }) }), _jsx("tbody", { children: superApps.map((sa) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: {
                                                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                                                        background: 'var(--bg-primary-subtle)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }, children: _jsx(Layers, { size: 13, style: { color: 'var(--text-accent)' } }) }), _jsx("span", { style: { fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }, children: sa.name })] }) }), _jsx("td", { children: _jsxs("span", { className: "p-tag", children: ["v", sa.version] }) }), _jsx("td", { children: _jsx("span", { className: `p-badge${sa.status === 'active' ? ' --success' : ' --warning'}`, children: sa.status }) }), _jsx("td", { style: { maxWidth: 280 }, children: _jsx("span", { style: { fontSize: 12, color: 'var(--text-secondary)' }, className: "truncate", title: sa.desc, children: sa.desc || '—' }) }), _jsx("td", { children: _jsxs("button", { onClick: () => {
                                                setActiveSuperApp(sa);
                                                navigate(`/${workspaceId}/sa/${sa.paramId}/documents`);
                                            }, style: {
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                fontSize: 12, color: 'var(--text-accent)', fontWeight: 500,
                                            }, children: ["Open ", _jsx(ArrowRight, { size: 12 })] }) })] }, sa._id))) })] }) }))] }));
}
