import { useParams, useNavigate } from 'react-router-dom';
import { Layers, FileText, Zap, Activity, ArrowRight, Plus } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useInstalledSuperApps } from '@/hooks/use-workspace';
import { useSuperAppStore } from '@/store/superapp.store';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function WorkspaceOverview() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaceList } = useWorkspaceStore();
  const { setActiveSuperApp } = useSuperAppStore();
  const navigate = useNavigate();

  const ws = workspaceList.find((w) => w.subdomain === workspaceId);
  const { data: superApps, isLoading } = useInstalledSuperApps(workspaceId ?? '');

  const activeCount = superApps?.filter((s) => s.status === 'active').length ?? 0;
  const totalCount = superApps?.length ?? 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Page header */}
      <div className="p-page-header">
        <div className="p-page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0,
            }}>
              {(ws?.workspaceName ?? workspaceId ?? 'W')[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                {ws?.workspaceName ?? workspaceId}
              </h1>
              <p className="p-tag" style={{ fontSize: 11, marginTop: 2 }}>
                {ws?.subdomain}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/${workspaceId}/superapps`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: 'var(--bg-primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
        >
          <Plus size={13} /> Install SuperApp
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24, marginBottom: 28 }}>
        {[
          { label: 'Total SuperApps', value: totalCount, icon: Layers, variant: '--primary' },
          { label: 'Active', value: activeCount, icon: Activity, variant: '--success' },
          { label: 'Documents', value: '—', icon: FileText, variant: '--info' },
          { label: 'Status', value: ws?.status ?? 'active', icon: Zap, variant: '--success' },
        ].map(({ label, value, icon: Icon, variant }) => (
          <div key={label} className="p-kpi-card">
            <div className="p-kpi-header">
              <span className="p-kpi-label">{label}</span>
              <div className={`p-kpi-icon ${variant}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="p-kpi-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Installed SuperApps table */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Installed SuperApps
        </h2>
        <button
          onClick={() => navigate(`/${workspaceId}/superapps`)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--text-accent)',
          }}
        >
          Manage <ArrowRight size={12} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <LoadingSpinner />
        </div>
      ) : !superApps?.length ? (
        <EmptyState
          icon={Layers}
          title="No SuperApps installed"
          description="Install a SuperApp from the catalog to start managing documents."
          action={
            <button
              onClick={() => navigate(`/${workspaceId}/superapps`)}
              style={{
                padding: '8px 16px', borderRadius: 7,
                background: 'var(--bg-primary)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              Install SuperApp
            </button>
          }
        />
      ) : (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {superApps.map((sa) => (
                <tr key={sa._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: 'var(--bg-primary-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Layers size={13} style={{ color: 'var(--text-accent)' }} />
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                        {sa.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="p-tag">v{sa.version}</span>
                  </td>
                  <td>
                    <span className={`p-badge${sa.status === 'active' ? ' --success' : ' --warning'}`}>
                      {sa.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }} className="truncate" title={sa.desc}>
                      {sa.desc || '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setActiveSuperApp(sa);
                        navigate(`/${workspaceId}/sa/${sa.paramId}/documents`);
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: 'var(--text-accent)', fontWeight: 500,
                      }}
                    >
                      Open <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
