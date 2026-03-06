import { NavLink, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSuperAppStore } from '@/store/superapp.store';
import { useInstalledSuperApps } from '@/hooks/useSuperApp';
import {
  FileText,
  LayoutDashboard,
  Settings,
  Package,
  GitBranch,
  Database,
  Shield,
  Box,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

interface LeftNavProps {
  mode: 'workspace' | 'definitions';
}

export function LeftNav({ mode }: LeftNavProps) {
  const { subdomain, superAppId } = useParams<{ subdomain?: string; superAppId?: string }>();
  const { activeSuperAppData } = useSuperAppStore();
  const { data: superapps = [] } = useInstalledSuperApps(subdomain ?? '');

  if (mode === 'definitions') {
    return (
      <nav className="flex w-[220px] shrink-0 flex-col gap-1 border-r bg-background p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
          Definitions
        </p>
        <NavItem to="/definitions/onchain/sm" icon={<GitBranch className="h-4 w-4" />} label="Onchain SM" />
        <NavItem to="/definitions/onchain/schema" icon={<Database className="h-4 w-4" />} label="Onchain Schema" />
        <NavItem to="/definitions/offchain/sm" icon={<GitBranch className="h-4 w-4" />} label="Offchain SM" />
        <NavItem to="/definitions/offchain/schema" icon={<Database className="h-4 w-4" />} label="Offchain Schema" />
        <NavItem to="/definitions/superapps" icon={<Box className="h-4 w-4" />} label="SuperApps" />
        <NavItem to="/definitions/rbac" icon={<Shield className="h-4 w-4" />} label="Team RBAC" />
      </nav>
    );
  }

  // Workspace mode
  return (
    <nav className="flex w-[220px] shrink-0 flex-col border-r bg-background">
      <ScrollArea className="flex-1">
        <div className="p-3">
          {subdomain && (
            <>
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Workspace
              </p>
              <NavItem
                to={`/workspace/${subdomain}`}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="SuperApps"
                end
              />
            </>
          )}

          {superAppId && activeSuperAppData && (
            <>
              <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase text-muted-foreground">
                {activeSuperAppData.name}
              </p>
              {activeSuperAppData.linkedSMs.map((smId) => (
                <NavItem
                  key={smId}
                  to={`/workspace/${subdomain}/${superAppId}/documents?sm=${smId}`}
                  icon={<FileText className="h-4 w-4" />}
                  label={smId}
                />
              ))}
            </>
          )}

          {!superAppId && superapps.length > 0 && (
            <>
              <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Installed Apps
              </p>
              {superapps.map((app) => (
                <NavLink
                  key={app._id}
                  to={`/workspace/${subdomain}/${app._id}/documents`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <Package className="h-4 w-4 shrink-0" />
                  <span className="truncate">{app.name}</span>
                </NavLink>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {subdomain && (
        <div className="border-t p-3">
          <NavItem
            to={`/workspace/${subdomain}/settings`}
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
          />
        </div>
      )}
    </nav>
  );
}
