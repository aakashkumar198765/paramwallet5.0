import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RightPanelProps {
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function RightPanel({ title, children, onClose, className }: RightPanelProps) {
  if (!children) return null;

  return (
    <aside
      className={cn(
        'flex h-full w-[260px] shrink-0 flex-col border-l bg-card',
        className,
      )}
    >
      {(title || onClose) && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
