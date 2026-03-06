import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, Navigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { useAuthStore } from '@/store/auth.store';
import { useDemoStore } from '@/store/demo.store';
export function AppShell() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { isDemoMode, demoRole, endDemo } = useDemoStore();
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-root)' }, children: [_jsx(TopBar, {}), isDemoMode && (_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px', height: 32, flexShrink: 0,
                    background: 'var(--bg-warning-subtle)',
                    borderBottom: '1px solid var(--bg-warning)',
                    fontSize: 12,
                }, children: [_jsxs("span", { style: { color: 'var(--text-warning)' }, children: [_jsx("strong", { children: "Demo mode" }), " \u2014 viewing as ", _jsx("strong", { children: demoRole }), ". Write operations use stubs."] }), _jsx("button", { onClick: endDemo, style: {
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 11, color: 'var(--text-warning)', textDecoration: 'underline',
                        }, children: "Exit demo" })] })), _jsxs("div", { style: { display: 'flex', flex: 1, overflow: 'hidden' }, children: [_jsx(LeftNav, {}), _jsx("main", { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }, children: _jsx("div", { style: { flex: 1 }, children: _jsx(Outlet, {}) }) })] }), _jsxs("footer", { className: "p-statusbar", children: [_jsxs("span", { className: "p-statusbar-item", children: [_jsx("span", { className: "p-statusbar-dot" }), "Connected"] }), _jsx("span", { className: "p-statusbar-item", children: "Param Backend v5.0" }), _jsx("span", { style: { flex: 1 } }), _jsx("span", { className: "p-statusbar-item", style: { fontFamily: "'JetBrains Mono', monospace" }, children: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })] })] }));
}
