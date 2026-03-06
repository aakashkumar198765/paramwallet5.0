import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function KpiStrip({ items, className }) {
    return (_jsx("div", { className: cn('flex gap-4 overflow-x-auto', className), children: items.map((item) => (_jsxs("div", { className: "flex shrink-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3 min-w-[120px]", children: [_jsx("span", { className: "text-xs text-muted-foreground", children: item.label }), _jsx("span", { className: "text-xl font-semibold tabular-nums", children: item.value })] }, item.label))) }));
}
