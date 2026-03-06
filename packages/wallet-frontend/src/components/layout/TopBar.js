import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Moon, Sun, LogOut, Settings, Diamond, ChevronDown } from 'lucide-react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useDemoStore } from '@/store/demo.store';
import { logout } from '@/api/auth.api';
import { useTheme } from '@/hooks/use-theme';
export function TopBar() {
    const { name, email, paramId, clearAuth } = useAuthStore();
    const { activeWorkspace } = useWorkspaceStore();
    const { isDemoMode, demoRole, endDemo } = useDemoStore();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const ws = workspaceId ?? activeWorkspace ?? '';
    const handleLogout = async () => {
        try {
            if (paramId)
                await logout(paramId);
        }
        catch { /* ignore */ }
        clearAuth();
        navigate('/login');
    };
    const initials = (name ?? email ?? 'U')
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    return (_jsxs("header", { className: "p-topbar", children: [_jsxs("div", { className: "flex items-center gap-2 mr-4", children: [_jsx("div", { className: "flex items-center justify-center rounded-md text-white font-bold text-xs", style: { width: 28, height: 28, background: 'var(--bg-primary)', fontSize: 11 }, children: "P" }), _jsx("span", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }, children: "Param Console" })] }), ws && (_jsxs(NavLink, { to: `/${ws}/definitions`, className: ({ isActive }) => `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${isActive
                    ? 'text-[var(--text-accent)] bg-[var(--bg-primary-subtle)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`, style: { textDecoration: 'none' }, children: [_jsx(Diamond, { size: 12 }), "Definitions"] })), _jsx("div", { style: { flex: 1 } }), isDemoMode && (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium", style: { background: 'var(--bg-warning-subtle)', color: 'var(--text-warning)' }, children: [_jsxs("span", { children: ["\uD83C\uDFAD ", demoRole] }), _jsx("button", { onClick: endDemo, className: "opacity-60 hover:opacity-100 transition-opacity", style: { fontSize: 11 }, children: "Exit" })] })), _jsx(Button, { variant: "ghost", size: "icon", onClick: toggleTheme, style: { width: 32, height: 32, color: 'var(--text-tertiary)' }, children: theme === 'dark' ? _jsx(Sun, { size: 15 }) : _jsx(Moon, { size: 15 }) }), ws && (_jsx(Button, { variant: "ghost", size: "icon", style: { width: 32, height: 32, color: 'var(--text-tertiary)' }, onClick: () => navigate(`/${ws}/settings`), children: _jsx(Settings, { size: 15 }) })), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs("button", { className: "flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]", style: { border: 'none', background: 'none', cursor: 'pointer' }, children: [_jsx("div", { className: "flex items-center justify-center rounded-md font-semibold text-white", style: {
                                        width: 28, height: 28, fontSize: 11,
                                        background: 'var(--bg-primary)',
                                        borderRadius: 6,
                                    }, children: initials }), _jsx("span", { style: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 120 }, className: "hidden sm:block truncate", children: name ?? email ?? 'Account' }), _jsx(ChevronDown, { size: 12, style: { color: 'var(--text-tertiary)' } })] }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-52", children: [_jsxs("div", { className: "px-3 py-2", children: [_jsx("p", { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }, children: name ?? email }), name && _jsx("p", { style: { fontSize: 11, color: 'var(--text-tertiary)' }, children: email }), paramId && (_jsxs("p", { className: "p-tag mt-1 truncate max-w-full", style: { fontSize: 10 }, children: [paramId.slice(0, 18), "\u2026"] }))] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: handleLogout, className: "text-destructive focus:text-destructive", children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), "Sign out"] })] })] })] }));
}
