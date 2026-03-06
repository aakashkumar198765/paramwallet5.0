import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useAuth';
import { useWorkspaces } from '@/hooks/useWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Building2, BookOpen, Plus, ExternalLink } from 'lucide-react';

export default function PostLogin() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workspaces = [], isLoading: wsLoading } = useWorkspaces();

  if (profileLoading || wsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Workspaces Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Workspaces</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/workspace/create')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
              <CardDescription>Your active workspace environments</CardDescription>
            </CardHeader>
            <CardContent>
              {workspaces.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No workspaces yet</p>
                  <Button size="sm" onClick={() => navigate('/workspace/create')}>
                    Create your first workspace
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.subdomain}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/workspace/${ws.subdomain}`)}
                    >
                      <div>
                        <p className="font-medium text-sm">{ws.workspaceName}</p>
                        <p className="text-xs text-muted-foreground">{ws.subdomain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ws.status === 'active' ? 'success' : 'secondary'}>
                          {ws.status}
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Definitions Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Definitions</CardTitle>
              </div>
              <CardDescription>Manage state machines, schemas, and SuperApps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Onchain State Machines', path: '/definitions/onchain/sm' },
                  { label: 'Onchain Schemas', path: '/definitions/onchain/schema' },
                  { label: 'Offchain State Machines', path: '/definitions/offchain/sm' },
                  { label: 'Offchain Schemas', path: '/definitions/offchain/schema' },
                  { label: 'SuperApp Definitions', path: '/definitions/superapps' },
                  { label: 'Team RBAC Matrices', path: '/definitions/rbac' },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
