import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SmState } from '@/types/definitions';

interface SubstateTabBarProps {
  state: SmState | null;
  activeSubState: string | null;
  onSelect: (subState: string | null) => void;
}

export function SubstateTabBar({ state, activeSubState, onSelect }: SubstateTabBarProps) {
  const subStates = state?.subStates ? Object.keys(state.subStates) : [];

  if (subStates.length === 0) return null;

  const tabs = ['All', ...subStates];

  return (
    <div className="border-b">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1 px-4 py-1">
          {tabs.map((tab) => {
            const value = tab === 'All' ? null : tab;
            const isActive = activeSubState === value;
            return (
              <button
                key={tab}
                onClick={() => onSelect(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
