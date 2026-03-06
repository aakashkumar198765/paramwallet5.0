import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInstalledSuperApps } from '@/hooks/useSuperApp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiStrip } from '@/components/layout/KpiStrip';
import { RightPanel } from '@/components/layout/RightPanel';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { useDemoStore } from '@/store/demo.store';
import { Plus, Package, Theater, ExternalLink } from 'lucide-react';
import type { InstalledSuperApp } from '@/types/workspace';
import DemoRolePicker from '@/pages/demo/DemoRolePicker';

export default function SuperAppList() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const { data: superapps = [], isLoading } = useInstalledSuperApps(subdomain!);
  const [selected, setSelected] = useState<InstalledSuperApp | null>(null);
  const [demoPickerOpen, setDemoPickerOpen] = useState(false);
  const { isDemoMode } = useDemoStore();

  const kpiItems = [
    { label: 'SuperApps', value: superapps.length },
    { label: 'Status', value: superapps.filter((s) => s.status === 'active').length, suffix: 'active' },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">SuperApps</h2>
            <p className="text-sm text-muted-foreground">{subdomain}</p>
          </div>
          <Button onClick={() => navigate(`/workspace/${subdomain}/create-superapp`)}>
            <Plus className="mr-2 h-4 w-4" /> Install SuperApp
          </Button>
        </div>

        <KpiStrip items={kpiItems} className="mb-4" />

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : superapps.length === 0 ? (
          <EmptyState
            title="No SuperApps installed"
            description="Install a SuperApp to start managing documents."
            icon={<Package className="h-10 w-10" />}
            action={{
              label: 'Install SuperApp',
              onClick: () => navigate(`/workspace/${subdomain}/create-superapp`),
            }}
          />
        ) : (
          <div className="grid gap-3">
            {superapps.map((app) => (
              <div
                key={app._id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  selected?._id === app._id ? 'border-primary bg-muted' : 'bg-card'
                }`}
                onClick={() => setSelected(app)}
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">v{app.version}</Badge>
                  <Badge variant={app.status === 'active' ? 'success' : 'secondary'}>
                    {app.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <RightPanel
        title={selected ? selected.name : 'Select a SuperApp'}
        onClose={selected ? () => setSelected(null) : undefined}
      >
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="font-medium">v{selected.version}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{selected.desc}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Installed</p>
              <p className="text-sm">{formatDate(selected.installedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Roles</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {selected.roles.map((r) => (
                  <Badge key={r.name} variant="outline" className="text-xs">
                    {r.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/workspace/${subdomain}/${selected._id}/documents`)
                }
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open App
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDemoPickerOpen(true)}
              >
                <Theater className="mr-2 h-3 w-3" />
                Demo Mode
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a SuperApp to see details and actions.
          </p>
        )}
      </RightPanel>

      {selected && (
        <DemoRolePicker
          open={demoPickerOpen}
          onClose={() => setDemoPickerOpen(false)}
          roles={selected.roles.map((r) => r.name)}
        />
      )}
    </div>
  );
}
