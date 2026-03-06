import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StateBadgeProps {
  state: string;
  subState?: string | null;
  microState?: string | null;
  className?: string;
}

function getStateColor(state: string): string {
  const lower = state.toLowerCase();
  if (lower.includes('draft') || lower.includes('pending')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (lower.includes('active') || lower.includes('approved') || lower.includes('complete')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (lower.includes('cancel') || lower.includes('reject') || lower.includes('close')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  if (lower.includes('review') || lower.includes('process')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  return 'bg-secondary text-secondary-foreground';
}

export function StateBadge({ state, subState, microState, className }: StateBadgeProps) {
  const label = [state, subState, microState].filter(Boolean).join(' / ');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        getStateColor(state),
        className
      )}
    >
      {label}
    </span>
  );
}
