import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  collapsed?: boolean;
}

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof value === 'boolean') return <span className="text-blue-500">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-green-600">{value}</span>;
  if (typeof value === 'string') return <span className="text-amber-600">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-xs ml-1">[{value.length}]</span>
        </button>
        {!collapsed && (
          <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
            {value.map((item, i) => (
              <div key={i}>
                <span className="text-muted-foreground text-xs">{i}: </span>
                <JsonNode value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{'{}'}</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="text-xs ml-1">{'{'}...{'}'}</span>
        </button>
        {!collapsed && (
          <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
            {entries.map(([key, val]) => (
              <div key={key}>
                <span className="text-primary font-medium text-xs">{key}</span>
                <span className="text-muted-foreground text-xs">: </span>
                <JsonNode value={val} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative rounded-md border bg-muted/30 p-3 font-mono text-xs', className)}>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
      <div className="overflow-x-auto pr-8">
        <JsonNode value={data} />
      </div>
    </div>
  );
}
