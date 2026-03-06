import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function EmptyState({ icon: Icon, title, description, action, className }) {
    return (_jsxs("div", { className: cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className), children: [Icon && (_jsx("div", { className: "rounded-full bg-muted p-4", children: _jsx(Icon, { className: "h-8 w-8 text-muted-foreground" }) })), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: title }), description && _jsx("p", { className: "text-sm text-muted-foreground", children: description })] }), action && _jsx("div", { className: "mt-2", children: action })] }));
}
