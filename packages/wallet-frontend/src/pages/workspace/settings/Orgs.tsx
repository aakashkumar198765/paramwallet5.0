import { useQuery } from '@tanstack/react-query';
import { listOrgs } from '@/api/org.api';
import { useSuperAppStore } from '@/store/superapp.store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Orgs() {
  const { activeSuperApp } = useSuperAppStore();

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations', activeSuperApp],
    queryFn: () => listOrgs(activeSuperApp!),
    enabled: !!activeSuperApp,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!orgs || orgs.length === 0) {
    return <div className="p-6">No organizations onboarded</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Organizations</h2>

      <div className="space-y-3">
        {orgs.map((org: any) => (
          <Card key={org._id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{org.org?.name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">
                  Role: {org.role} {org.isSponsorOrg && '(Sponsor)'}
                </div>
                {org.org?.partnerId && (
                  <div className="text-sm text-muted-foreground">
                    Partner ID: {org.org.partnerId}
                  </div>
                )}
              </div>
              <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                {org.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
