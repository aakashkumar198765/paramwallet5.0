import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/api/auth.api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Profile() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!profile) return <div className="p-6">Profile not found</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Profile</h2>

      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Name</label>
          <div className="mt-1 text-lg">{profile.name || profile.email}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <div className="mt-1">{profile.email}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Param ID</label>
          <div className="mt-1 font-mono text-sm">{profile.paramId}</div>
        </div>

        {profile.org && (
          <>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Organization</label>
              <div className="mt-1">{profile.org.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1">
                <Badge>{profile.role}</Badge>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
