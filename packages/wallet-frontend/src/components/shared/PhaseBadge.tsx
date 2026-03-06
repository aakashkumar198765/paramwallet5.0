import { cn } from '@/lib/utils';

interface PhaseBadgeProps {
  phase: string;
  className?: string;
}

const phaseColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  negotiation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  execution: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  settlement: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const colorClass = phaseColors[phase.toLowerCase()] ?? 'bg-secondary text-secondary-foreground';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-current/20',
        colorClass,
        className
      )}
    >
      {phase}
    </span>
  );
}
