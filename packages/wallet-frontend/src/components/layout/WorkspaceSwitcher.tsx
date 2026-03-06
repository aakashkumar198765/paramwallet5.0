import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useWorkspaces } from '@/hooks/useWorkspace';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const params = useParams<{ subdomain?: string }>();
  const currentSubdomain = params.subdomain;
  const { data: workspaces = [] } = useWorkspaces();

  const current = workspaces.find((w) => w.subdomain === currentSubdomain);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 max-w-[160px]">
          <span className="truncate">
            {current?.workspaceName ?? currentSubdomain ?? 'Select Workspace'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.subdomain}
            onClick={() => navigate(`/workspace/${ws.subdomain}`)}
            className={ws.subdomain === currentSubdomain ? 'font-medium' : ''}
          >
            {ws.workspaceName}
            <span className="ml-auto text-xs text-muted-foreground">{ws.subdomain}</span>
          </DropdownMenuItem>
        ))}
        {workspaces.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => navigate('/workspace/create')}>
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
