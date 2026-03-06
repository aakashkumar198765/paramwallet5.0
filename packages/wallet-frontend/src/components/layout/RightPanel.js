import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
export function RightPanel({ title, children, onClose, className }) {
    if (!children)
        return null;
    return (_jsxs("aside", { className: cn('flex h-full w-[260px] shrink-0 flex-col border-l bg-card', className), children: [(title || onClose) && (_jsxs("div", { className: "flex items-center justify-between border-b px-4 py-3", children: [title && _jsx("h3", { className: "text-sm font-semibold", children: title }), onClose && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 ml-auto", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) }))] })), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: children })] }));
}
