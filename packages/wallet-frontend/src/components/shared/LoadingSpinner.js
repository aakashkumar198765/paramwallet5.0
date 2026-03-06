import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
};
export function LoadingSpinner({ size = 'md', className }) {
    return (_jsx("div", { className: cn('animate-spin rounded-full border-muted-foreground/30 border-t-foreground', sizeMap[size], className), role: "status", "aria-label": "Loading" }));
}
export function FullPageSpinner() {
    return (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: _jsx(LoadingSpinner, { size: "lg" }) }));
}
