import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import type { DocumentAction } from '@/types/documents';

interface ActionButtonsProps {
  availableActions: DocumentAction[];
  alternateNextActions: DocumentAction[];
  linkedSmActions: DocumentAction[];
  onAction: (action: DocumentAction) => void;
  loading?: boolean;
}

function ActionButton({
  action,
  variant,
  onAction,
  loading,
}: {
  action: DocumentAction;
  variant: 'default' | 'outline' | 'secondary';
  onAction: (action: DocumentAction) => void;
  loading?: boolean;
}) {
  const button = (
    <Button
      variant={variant}
      size="sm"
      disabled={!action.canCreate || loading}
      onClick={() => onAction(action)}
    >
      {action.label}
    </Button>
  );

  if (!action.canCreate && action.diffReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[200px] text-xs">{action.diffReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

export function ActionButtons({
  availableActions,
  alternateNextActions,
  linkedSmActions,
  onAction,
  loading,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <ActionButton
          key={action.pipelineId + action.targetState}
          action={action}
          variant="default"
          onAction={onAction}
          loading={loading}
        />
      ))}
      {alternateNextActions.map((action) => (
        <ActionButton
          key={action.pipelineId + action.targetState}
          action={action}
          variant="outline"
          onAction={onAction}
          loading={loading}
        />
      ))}
      {linkedSmActions.map((action) => (
        <ActionButton
          key={action.pipelineId + action.targetState}
          action={action}
          variant="secondary"
          onAction={onAction}
          loading={loading}
        />
      ))}
    </div>
  );
}
