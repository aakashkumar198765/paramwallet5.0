import { cn } from '@/lib/utils';
import { Lock, LockOpen, Ban } from 'lucide-react';

interface AccessBadgeProps {
  access: 'RW' | 'RO' | 'N/A';
  className?: string;
  showIcon?: boolean;
}

const accessConfig = {
  RW: {
    label: 'RW',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    Icon: LockOpen,
  },
  RO: {
    label: 'RO',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    Icon: Lock,
  },
  'N/A': {
    label: 'N/A',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    Icon: Ban,
  },
};

export function AccessBadge({ access, className, showIcon = true }: AccessBadgeProps) {
  const config = accessConfig[access] ?? accessConfig['N/A'];
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
