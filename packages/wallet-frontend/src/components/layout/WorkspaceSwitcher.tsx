import { ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceStore } from '@/store/workspace.store';
import { truncate } from '@/lib/utils';

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaceList, setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const active = workspaceList.find((w) => w.subdomain === activeWorkspace);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
            {active?.workspaceName?.[0]?.toUpperCase() ?? 'W'}
          </div>
          <span className="flex-1 text-left truncate">
            {active ? truncate(active.workspaceName, 20) : 'Select workspace'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaceList.map((ws) => (
          <DropdownMenuItem
            key={ws._id}
            onClick={() => setActiveWorkspace(ws.subdomain)}
            className="gap-2"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-primary text-xs font-bold">
              {ws.workspaceName[0].toUpperCase()}
            </div>
            <span className="truncate">{ws.workspaceName}</span>
            {activeWorkspace === ws.subdomain && (
              <span className="ml-auto text-xs text-muted-foreground">active</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/workspace/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
