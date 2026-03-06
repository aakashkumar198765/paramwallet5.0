import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listUsersByRole } from '@/api/user.api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSuperAppStore } from '@/store/superapp.store';

export default function Users() {
  const { superAppId } = useParams<{ superAppId: string }>();
  const { activeSuperAppData } = useSuperAppStore();

  const roles = activeSuperAppData?.roles || [];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Users</h2>

      <Tabs defaultValue={roles[0]?.name || 'all'}>
        <TabsList>
          {roles.map((role: any) => (
            <TabsTrigger key={role.name} value={role.name}>
              {role.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role: any) => (
          <TabsContent key={role.name} value={role.name}>
            <RoleUsers superAppId={superAppId!} roleName={role.name} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function RoleUsers({ superAppId, roleName }: { superAppId: string; roleName: string }) {
  const { workspace } = useParams<{ workspace: string }>();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', workspace, superAppId, roleName],
    queryFn: () => listUsersByRole(superAppId, roleName),
    enabled: !!superAppId,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!users || users.length === 0) return <div>No users in this role</div>;

  return (
    <div className="space-y-3">
      {users.map((user: any) => (
        <Card key={user._id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{user.email}</div>
              <div className="text-sm text-muted-foreground">
                {user.plantTeams?.map((pt: any) => `${pt.plant}: ${pt.teams.join(', ')}`).join(' | ')}
              </div>
            </div>
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {user.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
