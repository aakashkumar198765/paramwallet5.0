import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDemoStore } from '@/store/demo.store';
import { useSuperAppStore } from '@/store/superapp.store';

interface DemoRolePickerProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoRolePicker({ open, onClose }: DemoRolePickerProps) {
  const { isDemoMode, demoRole, enterDemoMode, exitDemoMode } = useDemoStore();
  const { activeSuperAppData } = useSuperAppStore();

  const roles = activeSuperAppData?.roles || [];

  const handleRoleSelect = (roleName: string) => {
    enterDemoMode(roleName);
    onClose();
  };

  const handleEndDemo = () => {
    exitDemoMode();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDemoMode ? '🎭 Demo Mode Active' : 'Select Demo Role'}
          </DialogTitle>
        </DialogHeader>

        {isDemoMode ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Currently viewing as:</p>
              <Badge variant="outline" className="text-lg px-4 py-2">
                🎭 {demoRole}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              All document lists and permissions are filtered according to this role. Your actual
              role is not changed.
            </p>

            <Button onClick={handleEndDemo} variant="outline" className="w-full">
              End Demo Mode
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a role to preview the UI and permissions as if you were that role. This is for
              testing UX only — no actual changes will be made.
            </p>

            <div className="space-y-2">
              {roles.map((role: any) => (
                <Button
                  key={role.name}
                  onClick={() => handleRoleSelect(role.name)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <span className="font-medium">{role.name}</span>
                  {role.desc && (
                    <span className="ml-2 text-sm text-muted-foreground">— {role.desc}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
