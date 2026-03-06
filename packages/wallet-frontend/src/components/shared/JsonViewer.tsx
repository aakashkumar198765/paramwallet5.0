import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  defaultExpanded?: boolean;
}

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof value === 'boolean') return <span className="text-blue-500">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-amber-500">{value}</span>;
  if (typeof value === 'string') return <span className="text-green-500">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <span>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {expanded ? (
          <span>
            {'['}
            <div className="ml-4">
              {value.map((item, i) => (
                <div key={i}>
                  <JsonNode value={item} depth={depth + 1} />
                  {i < value.length - 1 && <span className="text-muted-foreground">,</span>}
                </div>
              ))}
            </div>
            {']'}
          </span>
        ) : (
          <span className="text-muted-foreground ml-1">[{value.length} items]</span>
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
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {expanded ? (
          <span>
            {'{'}
            <div className="ml-4">
              {entries.map(([k, v], i) => (
                <div key={k}>
                  <span className="text-purple-400">"{k}"</span>
                  <span className="text-muted-foreground">: </span>
                  <JsonNode value={v} depth={depth + 1} />
                  {i < entries.length - 1 && <span className="text-muted-foreground">,</span>}
                </div>
              ))}
            </div>
            {'}'}
          </span>
        ) : (
          <span className="text-muted-foreground ml-1">{'{'}…{'}'}</span>
        )}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function JsonViewer({ data, className, defaultExpanded: _def = true }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn('relative rounded-md border bg-muted/30 p-4', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre className="font-mono text-xs overflow-auto max-h-96">
        <JsonNode value={data} />
      </pre>
    </div>
  );
}
