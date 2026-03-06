import { useNavigate } from 'react-router-dom';
import { Settings, Moon, Sun, LogOut, Theater } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { useDemoStore } from '@/store/demo.store';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useState } from 'react';

export function TopBar() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const email = useAuthStore((s) => s.email);
  const { isDemoMode, demoRole, exitDemoMode } = useDemoStore();
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Brand */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/post-login')}
          className="flex items-center gap-2 font-semibold text-primary hover:opacity-80"
        >
          <span className="text-lg">⬡</span>
          <span>Wallet Console</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/definitions')}
          className="text-muted-foreground hover:text-foreground"
        >
          ◇ Definitions
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <WorkspaceSwitcher />

        {isDemoMode && demoRole && (
          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
            <Theater className="h-3 w-3" />
            {demoRole}
            <button
              className="ml-1 text-xs hover:text-destructive"
              onClick={exitDemoMode}
            >
              x
            </button>
          </Badge>
        )}

        <Button variant="ghost" size="icon" onClick={toggleDark}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/workspace/create')}>
              Create Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
