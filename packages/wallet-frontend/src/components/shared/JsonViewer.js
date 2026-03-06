import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
function JsonNode({ value, depth = 0 }) {
    const [expanded, setExpanded] = useState(depth < 2);
    if (value === null)
        return _jsx("span", { className: "text-muted-foreground", children: "null" });
    if (value === undefined)
        return _jsx("span", { className: "text-muted-foreground", children: "undefined" });
    if (typeof value === 'boolean')
        return _jsx("span", { className: "text-blue-500", children: String(value) });
    if (typeof value === 'number')
        return _jsx("span", { className: "text-amber-500", children: value });
    if (typeof value === 'string')
        return _jsxs("span", { className: "text-green-500", children: ["\"", value, "\""] });
    if (Array.isArray(value)) {
        if (value.length === 0)
            return _jsx("span", { className: "text-muted-foreground", children: "[]" });
        return (_jsxs("span", { children: [_jsx("button", { onClick: () => setExpanded((e) => !e), className: "inline-flex items-center text-muted-foreground hover:text-foreground", children: expanded ? _jsx(ChevronDown, { className: "h-3 w-3" }) : _jsx(ChevronRight, { className: "h-3 w-3" }) }), expanded ? (_jsxs("span", { children: ['[', _jsx("div", { className: "ml-4", children: value.map((item, i) => (_jsxs("div", { children: [_jsx(JsonNode, { value: item, depth: depth + 1 }), i < value.length - 1 && _jsx("span", { className: "text-muted-foreground", children: "," })] }, i))) }), ']'] })) : (_jsxs("span", { className: "text-muted-foreground ml-1", children: ["[", value.length, " items]"] }))] }));
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0)
            return _jsx("span", { className: "text-muted-foreground", children: '{}' });
        return (_jsxs("span", { children: [_jsx("button", { onClick: () => setExpanded((e) => !e), className: "inline-flex items-center text-muted-foreground hover:text-foreground", children: expanded ? _jsx(ChevronDown, { className: "h-3 w-3" }) : _jsx(ChevronRight, { className: "h-3 w-3" }) }), expanded ? (_jsxs("span", { children: ['{', _jsx("div", { className: "ml-4", children: entries.map(([k, v], i) => (_jsxs("div", { children: [_jsxs("span", { className: "text-purple-400", children: ["\"", k, "\""] }), _jsx("span", { className: "text-muted-foreground", children: ": " }), _jsx(JsonNode, { value: v, depth: depth + 1 }), i < entries.length - 1 && _jsx("span", { className: "text-muted-foreground", children: "," })] }, k))) }), '}'] })) : (_jsxs("span", { className: "text-muted-foreground ml-1", children: ['{', "\u2026", '}'] }))] }));
    }
    return _jsx("span", { children: String(value) });
}
export function JsonViewer({ data, className, defaultExpanded: _def = true }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (_jsxs("div", { className: cn('relative rounded-md border bg-muted/30 p-4', className), children: [_jsx(Button, { variant: "ghost", size: "icon", className: "absolute right-2 top-2 h-6 w-6", onClick: handleCopy, children: copied ? _jsx(Check, { className: "h-3 w-3" }) : _jsx(Copy, { className: "h-3 w-3" }) }), _jsx("pre", { className: "font-mono text-xs overflow-auto max-h-96", children: _jsx(JsonNode, { value: data }) })] }));
}
