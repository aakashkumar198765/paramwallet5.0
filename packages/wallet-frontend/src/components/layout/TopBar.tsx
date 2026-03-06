import { Moon, Sun, LogOut, Settings, Diamond, ChevronDown } from 'lucide-react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const ws = workspaceId ?? activeWorkspace ?? '';

  const handleLogout = async () => {
    try { if (paramId) await logout(paramId); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
  };

  const initials = (name ?? email ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="p-topbar">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-4">
        <div
          className="flex items-center justify-center rounded-md text-white font-bold text-xs"
          style={{ width: 28, height: 28, background: 'var(--bg-primary)', fontSize: 11 }}
        >
          P
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          Param Console
        </span>
      </div>

      {/* ◇ Definitions pill — links to global definitions (outside workspace) */}
      {ws && (
        <NavLink
          to={`/${ws}/definitions`}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'text-[var(--text-accent)] bg-[var(--bg-primary-subtle)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`
          }
          style={{ textDecoration: 'none' }}
        >
          <Diamond size={12} />
          Definitions
        </NavLink>
      )}

      <div style={{ flex: 1 }} />

      {/* Demo mode badge */}
      {isDemoMode && (
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'var(--bg-warning-subtle)', color: 'var(--text-warning)' }}
        >
          <span>🎭 {demoRole}</span>
          <button
            onClick={endDemo}
            className="opacity-60 hover:opacity-100 transition-opacity"
            style={{ fontSize: 11 }}
          >
            Exit
          </button>
        </div>
      )}

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme}
        style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}>
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </Button>

      {/* Settings */}
      {ws && (
        <Button variant="ghost" size="icon"
          style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}
          onClick={() => navigate(`/${ws}/settings`)}
        >
          <Settings size={15} />
        </Button>
      )}

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <div
              className="flex items-center justify-center rounded-md font-semibold text-white"
              style={{
                width: 28, height: 28, fontSize: 11,
                background: 'var(--bg-primary)',
                borderRadius: 6,
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 120 }}
              className="hidden sm:block truncate">
              {name ?? email ?? 'Account'}
            </span>
            <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-3 py-2">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{name ?? email}</p>
            {name && <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{email}</p>}
            {paramId && (
              <p className="p-tag mt-1 truncate max-w-full" style={{ fontSize: 10 }}>
                {paramId.slice(0, 18)}…
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
