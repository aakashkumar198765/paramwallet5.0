import { Outlet, Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User, Users, Shield, Building2, MapPin, Database } from 'lucide-react';

const settingsTabs = [
  { name: 'Profile', path: 'profile', icon: User },
  { name: 'Users', path: 'users', icon: Users },
  { name: 'RBAC', path: 'rbac', icon: Shield },
  { name: 'Organizations', path: 'orgs', icon: Building2 },
  { name: 'Plants', path: 'plants', icon: MapPin },
  { name: 'Master Data', path: 'master-data', icon: Database },
];

export default function Settings() {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();

  return (
    <div className="flex h-full">
      {/* Left tabs */}
      <div className="w-64 border-r bg-muted/10 p-4 space-y-2">
        <h2 className="px-3 text-lg font-semibold mb-4">Settings</h2>
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.path} to={tab.path}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  currentPath === tab.path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
