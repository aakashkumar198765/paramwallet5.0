import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

interface KpiStripProps {
  items: KpiItem[];
  className?: string;
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex shrink-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3 min-w-[120px]"
        >
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="text-xl font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
