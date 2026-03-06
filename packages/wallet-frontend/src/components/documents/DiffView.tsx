import { cn } from '@/lib/utils';
import type { DiffResponse } from '@/types/documents';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface DiffViewProps {
  diff: DiffResponse | undefined;
  isLoading?: boolean;
}

function BalanceBar({ value }: { value: number }) {
  const abs = Math.abs(value);
  const max = 100;
  const width = Math.min((abs / max) * 100, 100);
  const positive = value >= 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', positive ? 'bg-green-500' : 'bg-red-500')}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={cn('text-xs font-mono font-semibold', positive ? 'text-green-600' : 'text-red-600')}
      >
        {positive ? '+' : ''}{value}
      </span>
    </div>
  );
}

export function DiffView({ diff, isLoading }: DiffViewProps) {
  if (isLoading) return <LoadingSpinner size="sm" text="Computing diff..." />;
  if (!diff) return null;

  const entries = Object.entries(diff.diff);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No diff data available.</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Chain Diff</h4>
      <div className="space-y-1 rounded-md border p-3">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{key}</span>
            <BalanceBar value={val.balance} />
          </div>
        ))}
      </div>
      {diff.orderedItems.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Ordered Items
          </h4>
          <div className="space-y-1 rounded-md border p-3 font-mono text-xs">
            {diff.orderedItems.map((item, i) => (
              <div key={i} className="text-muted-foreground">
                {JSON.stringify(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
