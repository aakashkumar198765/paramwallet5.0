import { useNavigate, useParams } from 'react-router-dom';
import { useAvailableSuperApps, useInstallSuperApp } from '@/hooks/useSuperApp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Box, Download } from 'lucide-react';

export default function SuperAppInstall() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: available = [], isLoading } = useAvailableSuperApps();
  const installMutation = useInstallSuperApp();

  const handleInstall = async (superAppDefId: string, name: string) => {
    try {
      await installMutation.mutateAsync({ superAppDefId });
      toast({ title: 'Installed', description: `${name} has been installed.` });
      navigate(`/workspace/${subdomain}`);
    } catch {
      toast({ variant: 'destructive', title: 'Install failed', description: 'Could not install SuperApp.' });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/workspace/${subdomain}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">Install SuperApp</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : available.length === 0 ? (
        <EmptyState
          title="No SuperApps available"
          description="Create SuperApp definitions first."
          icon={<Box className="h-10 w-10" />}
          action={{ label: 'Create Definition', onClick: () => navigate('/definitions/superapps/new') }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((app) => (
            <Card key={app._id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{app.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">v{app.version}</Badge>
                </div>
                <CardDescription>{app.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {app.roles.slice(0, 4).map((r) => (
                      <Badge key={r.name} variant="outline" className="text-xs">
                        {r.name}
                      </Badge>
                    ))}
                    {app.roles.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{app.roles.length - 4}</Badge>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleInstall(app._id, app.name)}
                  disabled={installMutation.isPending}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {installMutation.isPending ? 'Installing...' : 'Install'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
