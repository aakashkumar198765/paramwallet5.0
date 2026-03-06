import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface RightPanelProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function RightPanel({ title, onClose, children, className }: RightPanelProps) {
  return (
    <aside
      className={cn(
        'flex w-[260px] shrink-0 flex-col border-l bg-background',
        className
      )}
    >
      {(title || onClose) && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-4">{children}</div>
      </ScrollArea>
    </aside>
  );
}
