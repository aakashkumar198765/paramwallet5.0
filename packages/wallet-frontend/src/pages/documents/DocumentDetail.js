import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocument, useDocumentActions, useDocumentDiff, useDocumentChain, docKeys } from '@/hooks/use-documents';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StateBadge } from '@/components/shared/StateBadge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { transitionDocument } from '@/api/paramgateway/stubs';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
export function DocumentDetail() {
    const { workspaceId, superAppId, docId } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [tab, setTab] = useState('data');
    const [transitioning, setTransitioning] = useState(null);
    const { data: doc, isLoading } = useDocument(workspaceId ?? '', superAppId ?? '', docId ?? '');
    const { data: actionsResult } = useDocumentActions(workspaceId ?? '', superAppId ?? '', docId ?? '');
    const { data: diff } = useDocumentDiff(workspaceId ?? '', superAppId ?? '', docId ?? '');
    const { data: chain } = useDocumentChain(workspaceId ?? '', superAppId ?? '', docId ?? '');
    const handleTransition = async (action) => {
        if (!docId)
            return;
        setTransitioning(action.targetState);
        try {
            const smId = action.smId ?? doc?._local?.smId ?? '';
            await transitionDocument(smId, {
                docId,
                stateTo: action.targetState,
                subStateTo: action.targetSubState,
                microStateTo: action.targetMicroState,
                data: {},
            });
            toast({ title: 'Transition submitted', description: `→ ${action.label}` });
            qc.invalidateQueries({ queryKey: docKeys.detail(workspaceId ?? '', superAppId ?? '', docId) });
            qc.invalidateQueries({ queryKey: docKeys.actions(workspaceId ?? '', superAppId ?? '', docId) });
        }
        catch {
            toast({ variant: 'destructive', title: 'Transition failed' });
        }
        finally {
            setTransitioning(null);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center p-12", children: _jsx(LoadingSpinner, {}) });
    if (!doc)
        return _jsx("div", { className: "p-6 text-muted-foreground", children: "Document not found." });
    const allActions = [
        ...(actionsResult?.availableActions ?? []),
        ...(actionsResult?.alternateNextActions ?? []),
        ...(actionsResult?.linkedSmActions ?? []),
    ];
    const isReadOnly = doc._access === 'RO';
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center gap-3 border-b px-6 py-4", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => navigate(-1), children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-mono text-sm font-medium truncate", children: doc._id }), _jsx("p", { className: "text-xs text-muted-foreground", children: doc._local?.smId })] }), _jsx(StateBadge, { state: doc._local?.state ?? '', subState: doc._local?.subState ?? undefined, microState: doc._local?.microState ?? undefined }), isReadOnly && _jsx(Badge, { variant: "secondary", children: "Read Only" })] }), !isReadOnly && allActions.length > 0 && (_jsxs("div", { className: "flex items-center gap-2 border-b px-6 py-3 overflow-x-auto", children: [_jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: "Transition:" }), allActions.map((action) => (_jsxs(Button, { size: "sm", variant: "outline", className: "shrink-0 gap-1", disabled: transitioning !== null, onClick: () => handleTransition(action), children: [transitioning === action.targetState ? (_jsx(LoadingSpinner, { size: "sm" })) : (_jsx(ChevronRight, { className: "h-3 w-3" })), action.label] }, `${action.targetState}-${action.targetSubState ?? ''}`)))] })), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: _jsxs(Tabs, { value: tab, onValueChange: setTab, children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "data", children: "Data" }), _jsx(TabsTrigger, { value: "chain", children: "Chain" }), _jsx(TabsTrigger, { value: "diff", disabled: !diff, children: "Diff" }), _jsx(TabsTrigger, { value: "history", children: "History" })] }), _jsx(TabsContent, { value: "data", className: "mt-4", children: _jsx(JsonViewer, { data: doc }) }), _jsx(TabsContent, { value: "chain", className: "mt-4", children: chain ? (_jsx("div", { className: "space-y-3", children: chain.chain.map((entry) => (_jsxs("div", { className: "rounded-md border p-3 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(StateBadge, { state: entry.stateTo, subState: entry.subStateTo ?? undefined }), _jsx("span", { className: "text-xs text-muted-foreground", children: formatDateTime(entry.timestamp) })] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [entry.changeType, " by ", entry.actor] })] }, entry._id))) })) : (_jsx("div", { className: "text-sm text-muted-foreground", children: "No chain history." })) }), diff && (_jsx(TabsContent, { value: "diff", className: "mt-4", children: _jsx(JsonViewer, { data: diff }) })), _jsx(TabsContent, { value: "history", className: "mt-4", children: _jsx(JsonViewer, { data: doc._chain }) })] }) })] }));
}
