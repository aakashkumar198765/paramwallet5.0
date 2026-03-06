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
function WorkspacesSection({ workspaces, onSelect, onCreateNew }: {
  workspaces: { _id: string; workspaceName: string; subdomain: string; status?: string }[];
  onSelect: (subdomain: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Your Workspaces
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={onCreateNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            border: '1px solid var(--border-primary)',
            background: 'none', borderRadius: 7, padding: '6px 12px',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            color: 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseOut={e => (e.currentTarget.style.background = 'none')}
        >
          <Plus size={13} /> New workspace
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {workspaces.map((ws) => (
          <button
            key={ws._id}
            onClick={() => onSelect(ws.subdomain)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              textAlign: 'left', padding: 16,
              border: '1px solid var(--border-primary)',
              borderRadius: 10, background: 'var(--bg-surface)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            className="p-ws-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, color: '#fff',
              }}>
                {ws.workspaceName[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="truncate">
                  {ws.workspaceName}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }} className="p-tag truncate">
                  {ws.subdomain}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                className={`p-badge${ws.status === 'active' ? ' --success' : ' --default'}`}
                style={{ fontSize: 10 }}
              >
                {ws.status ?? 'active'}
              </span>
              <ArrowRight size={13} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Section: SuperApp Definitions catalog */
function DefinitionsSection({ ws }: { ws: string }) {
  const { data: defs, isLoading } = useSuperAppDefs(ws);

  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          SuperApp Catalog
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Available application definitions for this workspace
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <FullPageSpinner />
        </div>
      ) : !defs?.length ? (
        <div style={{
          border: '1px dashed var(--border-primary)',
          borderRadius: 10, padding: 32, textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
        }}>
          <Layers size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>No SuperApp definitions yet</p>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>Create definitions from the Definitions hub.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {defs.map((def) => (
            <div
              key={def._id}
              style={{
                padding: 16,
                border: '1px solid var(--border-primary)',
                borderRadius: 10, background: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                  background: 'var(--bg-primary-subtle)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Layers size={14} style={{ color: 'var(--text-accent)' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="truncate">
                    {def.name}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>v{def.version}</p>
                </div>
              </div>
              {def.desc && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}
                   className="line-clamp-2">
                  {def.desc}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className={`p-badge${def.isActive ? ' --success' : ' --default'}`}
                  style={{ fontSize: 10 }}
                >
                  {def.isActive ? 'active' : 'inactive'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>
                  {def.roles.length} role{def.roles.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PostLogin() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { setWorkspaceList, setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!workspaces) return;
    setWorkspaceList(workspaces);
    if (workspaces.length === 1) {
      setActiveWorkspace(workspaces[0].subdomain);
      navigate(`/${workspaces[0].subdomain}`);
    }
  }, [workspaces, setWorkspaceList, setActiveWorkspace, navigate]);

  if (isLoading) return <FullPageSpinner />;

  if (!workspaces?.length) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={Building2}
          title="No workspaces yet"
          description="Create your first workspace to get started."
          action={<Button onClick={() => navigate('/workspace/create')}>Create Workspace</Button>}
        />
      </div>
    );
  }

  const handleSelect = (subdomain: string) => {
    setActiveWorkspace(subdomain);
    navigate(`/${subdomain}`);
  };

  const activeWs = workspaces[0].subdomain;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-root)' }}>
      {/* Top bar */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 32px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, color: '#fff',
          }}>P</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Param Console
          </span>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Welcome */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Select a workspace to continue, or explore the SuperApp catalog.
          </p>
        </div>

        {/* Workspaces */}
        <WorkspacesSection
          workspaces={workspaces}
          onSelect={handleSelect}
          onCreateNew={() => navigate('/workspace/create')}
        />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-primary)' }} />

        {/* SuperApp Definitions catalog */}
        <DefinitionsSection ws={activeWs} />
      </div>
    </div>
  );
}
