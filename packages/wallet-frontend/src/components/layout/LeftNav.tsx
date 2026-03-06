import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  FileText,
  PlayCircle,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { useDemoStore } from '@/store/demo.store';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `p-sidebar-item${isActive ? ' active' : ''}`}
    >
      <span className="p-sidebar-item-icon">{icon}</span>
      <span className="p-sidebar-item-label">{label}</span>
    </NavLink>
  );
}

export function LeftNav() {
  const { workspaceId } = useParams<{ workspaceId: string; superAppId?: string }>();
  const { workspaceList, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const { activeSuperApp } = useSuperAppStore();
  const { isDemoMode } = useDemoStore();
  const navigate = useNavigate();
  const [wsDropOpen, setWsDropOpen] = useState(false);

  const ws = workspaceId ?? activeWorkspace ?? '';
  const currentWs = workspaceList.find((w) => w.subdomain === ws);

  const handleSwitchWorkspace = (subdomain: string) => {
    setActiveWorkspace(subdomain);
    navigate(`/${subdomain}`);
    setWsDropOpen(false);
  };

  return (
    <aside className="p-sidebar">
      {/* ── Workspace switcher ── */}
      <div className="p-sidebar-header">
        <button
          className="p-sidebar-brand"
          onClick={() => setWsDropOpen((o) => !o)}
        >
          <div className="p-sidebar-avatar">
            {(currentWs?.workspaceName ?? ws ?? 'W')[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}
               className="truncate">
              {currentWs?.workspaceName ?? ws ?? 'Workspace'}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }} className="truncate">
              {ws}
            </p>
          </div>
          {workspaceList.length > 1
            ? <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            : <ChevronRight size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.35 }} />
          }
        </button>

        {/* Dropdown */}
        {wsDropOpen && workspaceList.length > 1 && (
          <div style={{
            marginTop: 4, borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-surface)',
            boxShadow: 'var(--shadow-md)',
          }}>
            {workspaceList.map((w) => (
              <button
                key={w.subdomain}
                onClick={() => handleSwitchWorkspace(w.subdomain)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  border: 'none', cursor: 'pointer',
                  background: w.subdomain === ws ? 'var(--bg-selected)' : 'none',
                  transition: 'background 0.15s',
                  display: 'block',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = w.subdomain === ws ? 'var(--bg-selected)' : 'none')}
              >
                <p style={{ fontSize: 12, fontWeight: w.subdomain === ws ? 600 : 400, color: w.subdomain === ws ? 'var(--text-accent)' : 'var(--text-primary)', margin: 0 }}>
                  {w.workspaceName}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>{w.subdomain}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Workspace section ── */}
      {ws && (
        <div className="p-sidebar-nav">
          <div className="p-sidebar-section-label">Workspace</div>
          <NavItem to={`/${ws}`} end icon={<LayoutDashboard size={14} />} label="Overview" />
          <NavItem to={`/${ws}/superapps`} icon={<Layers size={14} />} label="SuperApps" />
        </div>
      )}

      {/* ── Active SuperApp section ── */}
      {activeSuperApp && ws && (
        <div className="p-sidebar-nav" style={{ marginTop: 4 }}>
          <div className="p-sidebar-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              background: 'var(--bg-primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#fff',
            }}>
              {activeSuperApp.name[0]?.toUpperCase()}
            </span>
            <span className="truncate">{activeSuperApp.name}</span>
          </div>
          <NavItem
            to={`/${ws}/sa/${activeSuperApp.paramId}/documents`}
            icon={<FileText size={14} />}
            label="Documents"
          />
          <NavItem
            to={`/${ws}/sa/${activeSuperApp.paramId}/demo`}
            icon={<PlayCircle size={14} />}
            label="Demo Mode"
          />
        </div>
      )}

      {/* ── Demo badge ── */}
      {isDemoMode && (
        <div style={{
          margin: '8px 10px',
          padding: '6px 10px',
          borderRadius: 7,
          background: 'var(--bg-warning-subtle)',
          border: '1px solid var(--bg-warning)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-warning)', margin: 0 }}>
            🎭 Demo Mode Active
          </p>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Settings ── */}
      {ws && (
        <div className="p-sidebar-nav" style={{ paddingBottom: 4 }}>
          <NavItem to={`/${ws}/settings`} icon={<Settings size={14} />} label="Settings" />
        </div>
      )}

      {/* ── Footer / new workspace ── */}
      <div className="p-sidebar-footer">
        <button
          onClick={() => navigate('/workspace/create')}
          className="p-sidebar-user"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <div style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            border: '1px dashed var(--border-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus size={12} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>New Workspace</span>
        </button>
      </div>
    </aside>
  );
}
