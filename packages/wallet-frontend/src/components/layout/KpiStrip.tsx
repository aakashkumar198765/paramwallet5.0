import { cn } from '@/lib/utils';

interface KpiItem {
  label: string;
  value: number | string;
  suffix?: string;
}

interface KpiStripProps {
  items: KpiItem[];
  className?: string;
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div className={cn('flex items-center gap-6 rounded-lg border bg-card px-4 py-3', className)}>
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="text-xl font-bold text-foreground">
            {item.value}
            {item.suffix && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">{item.suffix}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
