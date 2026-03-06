import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from './LoadingSpinner';
export function FormDialog({ open, onOpenChange, title, description, children, onSubmit, isLoading = false, submitLabel = 'Save', cancelLabel = 'Cancel', destructive = false, }) {
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-lg", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: title }), description && _jsx(DialogDescription, { children: description })] }), _jsx("div", { className: "space-y-4 py-2", children: children }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: isLoading, children: cancelLabel }), _jsxs(Button, { variant: destructive ? 'destructive' : 'default', onClick: onSubmit, disabled: isLoading, children: [isLoading && _jsx(LoadingSpinner, { size: "sm", className: "mr-2" }), submitLabel] })] })] }) }));
}
