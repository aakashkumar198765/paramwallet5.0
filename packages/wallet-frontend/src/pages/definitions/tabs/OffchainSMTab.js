import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { GitMerge, Eye, Upload } from 'lucide-react';
import { useOffchainSMs } from '@/hooks/use-definitions';
import { deployOffchainSM } from '@/api/paramgateway/stubs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
export function OffchainSMTab({ ws }) {
    const { data: sms, isLoading } = useOffchainSMs(ws);
    const [viewSM, setViewSM] = useState(null);
    const [deploying, setDeploying] = useState(null);
    const handleDeploy = async (sm) => {
        setDeploying(sm._id);
        try {
            await deployOffchainSM({ smId: sm._id, name: sm.name, states: sm.states });
            toast({ title: 'Deploy submitted (stub)', description: `${sm.name} → ParamGateway` });
        }
        catch {
            toast({ variant: 'destructive', title: 'Deploy failed' });
        }
        finally {
            setDeploying(null);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center py-8", children: _jsx(LoadingSpinner, {}) });
    if (!sms?.length)
        return _jsx(EmptyState, { icon: GitMerge, title: "No offchain state machines" });
    return (_jsxs("div", { className: "space-y-2 mt-2", children: [_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "States" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: sms.map((sm) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: sm.name }), _jsx(TableCell, { children: Object.keys(sm.states).length }), _jsx(TableCell, { className: "text-xs text-muted-foreground", children: formatDate(sm.createdAt) }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs gap-1", onClick: () => setViewSM(sm), children: [_jsx(Eye, { className: "h-3 w-3" }), "View"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-7 text-xs gap-1", disabled: deploying === sm._id, onClick: () => handleDeploy(sm), children: [deploying === sm._id ? _jsx(LoadingSpinner, { size: "sm" }) : _jsx(Upload, { className: "h-3 w-3" }), "Deploy"] })] }) })] }, sm._id))) })] }) }), _jsx(Dialog, { open: !!viewSM, onOpenChange: (o) => { if (!o)
                    setViewSM(null); }, children: _jsxs(DialogContent, { className: "sm:max-w-2xl", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: viewSM?.name }) }), viewSM && _jsx(JsonViewer, { data: viewSM })] }) })] }));
}
