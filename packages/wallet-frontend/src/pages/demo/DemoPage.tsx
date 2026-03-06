import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Play, StopCircle } from 'lucide-react';
import { useDemoStore } from '@/store/demo.store';
import { useSuperAppStore } from '@/store/superapp.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function DemoPage() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
  const { isDemoMode, demoRole, startDemo, endDemo } = useDemoStore();
  const { activeSuperApp } = useSuperAppStore();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(demoRole ?? '');

  const roles = activeSuperApp?.roles?.map((r) => r.name) ?? [];

  const handleStart = () => {
    if (!selectedRole) return;
    startDemo(selectedRole);
    navigate(`/${workspaceId}/sa/${superAppId}/documents`);
  };

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Demo Mode</h1>
          <p className="text-sm text-muted-foreground">
            Preview the UI as a specific role without affecting real data.
          </p>
        </div>
      </div>

      {isDemoMode && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Badge variant="warning">Demo Active</Badge>
          <span className="text-sm">
            Viewing as <strong>{demoRole}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1"
            onClick={endDemo}
          >
            <StopCircle className="h-4 w-4" />
            End Demo
          </Button>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Select role to preview</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role…" />
            </SelectTrigger>
            <SelectContent>
              {roles.length ? (
                roles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))
              ) : (
                <SelectItem value="viewer">viewer</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full gap-2"
          disabled={!selectedRole}
          onClick={handleStart}
        >
          <Play className="h-4 w-4" />
          Start Demo as {selectedRole || '…'}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Demo mode applies RBAC filtering based on the selected role.</p>
        <p>• All write operations use ParamGateway stubs — no real transactions.</p>
        <p>• A banner will be shown while demo mode is active.</p>
      </div>
    </div>
  );
}
