import { Badge } from '@/components/ui/badge';
import { capitalize } from '@/lib/utils';

interface StateBadgeProps {
  state: string;
  subState?: string;
  microState?: string;
}

const stateColorMap: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'secondary'> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  pending: 'warning',
  review: 'warning',
  draft: 'secondary',
  rejected: 'destructive',
  cancelled: 'destructive',
  processing: 'info',
};

function getVariant(state: string) {
  return stateColorMap[state.toLowerCase()] ?? 'secondary';
}

export function StateBadge({ state, subState, microState }: StateBadgeProps) {
  const label = [state, subState, microState].filter((s): s is string => !!s).map(capitalize).join(' › ');
  return <Badge variant={getVariant(state)}>{label}</Badge>;
}
