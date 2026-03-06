import { Outlet, Navigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { useAuthStore } from '@/store/auth.store';
import { useDemoStore } from '@/store/demo.store';

export function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isDemoMode, demoRole, endDemo } = useDemoStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-root)' }}>
      <TopBar />

      {isDemoMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 32, flexShrink: 0,
          background: 'var(--bg-warning-subtle)',
          borderBottom: '1px solid var(--bg-warning)',
          fontSize: 12,
        }}>
          <span style={{ color: 'var(--text-warning)' }}>
            <strong>Demo mode</strong> — viewing as <strong>{demoRole}</strong>. Write operations use stubs.
          </span>
          <button
            onClick={endDemo}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-warning)', textDecoration: 'underline',
            }}
          >
            Exit demo
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftNav />
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Status bar */}
      <footer className="p-statusbar">
        <span className="p-statusbar-item">
          <span className="p-statusbar-dot" />
          Connected
        </span>
        <span className="p-statusbar-item">Param Backend v5.0</span>
        <span style={{ flex: 1 }} />
        <span className="p-statusbar-item" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </footer>
    </div>
  );
}
