import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Search, FileText, Filter, X } from 'lucide-react';
import { useDocuments } from '@/hooks/use-documents';
import { useSuperAppStore } from '@/store/superapp.store';
import { useSMs } from '@/hooks/use-definitions';
import { StateBadge } from '@/components/shared/StateBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';
const PAGE_SIZE = 50;
export function DocumentList() {
    const { workspaceId, superAppId } = useParams();
    const { activeSuperApp, activeDocType, setActiveDocType } = useSuperAppStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterSubState, setFilterSubState] = useState('');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const { data: sms } = useSMs(workspaceId ?? '');
    const activeSM = sms?.find((sm) => sm._id === activeDocType);
    const stateOptions = activeSM ? Object.keys(activeSM.states) : [];
    const subStateOptions = filterState && activeSM?.states[filterState]?.subStates
        ? Object.keys(activeSM.states[filterState].subStates ?? {})
        : [];
    const activeFilterCount = [filterState, filterSubState].filter(Boolean).length;
    const clearFilters = () => { setFilterState(''); setFilterSubState(''); setPage(1); };
    const params = {
        superAppId: superAppId ?? '',
        smId: activeDocType ?? undefined,
        state: filterState || undefined,
        subState: filterSubState || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
    };
    const { data, isLoading, isFetching } = useDocuments(workspaceId ?? '', superAppId ?? '', params);
    const parentRef = useRef(null);
    const docs = data?.documents ?? [];
    const virtualizer = useVirtualizer({
        count: docs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 56,
        overscan: 5,
    });
    const docTypes = activeSuperApp?.linkedSMs ?? [];
    const handleSearch = useCallback((e) => {
        setSearch(e.target.value);
        setPage(1);
    }, []);
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center justify-between border-b px-6 py-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold", children: activeSuperApp?.name ?? 'Documents' }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [data?.total ?? 0, " documents", isFetching && !isLoading && (_jsx("span", { className: "ml-2 text-muted-foreground", children: "Refreshing\u2026" }))] })] }), _jsxs(Button, { size: "sm", onClick: () => navigate(`/${workspaceId}/sa/${superAppId}/documents/new`), children: [_jsx(Plus, { className: "mr-1.5 h-4 w-4" }), "New Document"] })] }), docTypes.length > 1 && (_jsx("div", { className: "border-b px-6 py-2", children: _jsx(Tabs, { value: activeDocType ?? 'all', onValueChange: (v) => {
                        setActiveDocType(v === 'all' ? null : v);
                        setPage(1);
                    }, children: _jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "all", className: "text-xs", children: "All" }), docTypes.map((dt) => (_jsx(TabsTrigger, { value: dt, className: "text-xs", children: dt }, dt)))] }) }) })), _jsxs("div", { className: "border-b px-6 py-3 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx(Search, { className: "absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { placeholder: "Search documents\u2026", className: "pl-8", value: search, onChange: handleSearch })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5 h-9", onClick: () => setShowFilters((f) => !f), children: [_jsx(Filter, { className: "h-3.5 w-3.5" }), "Filters", activeFilterCount > 0 && (_jsx(Badge, { variant: "secondary", className: "ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs", children: activeFilterCount }))] }), activeFilterCount > 0 && (_jsxs(Button, { variant: "ghost", size: "sm", className: "gap-1 h-9 text-muted-foreground", onClick: clearFilters, children: [_jsx(X, { className: "h-3.5 w-3.5" }), "Clear"] }))] }), showFilters && (_jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsxs(Select, { value: filterState, onValueChange: (v) => { setFilterState(v); setFilterSubState(''); setPage(1); }, children: [_jsx(SelectTrigger, { className: "w-40 h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Any state" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Any state" }), stateOptions.map((s) => _jsx(SelectItem, { value: s, children: s }, s))] })] }), subStateOptions.length > 0 && (_jsxs(Select, { value: filterSubState, onValueChange: (v) => { setFilterSubState(v); setPage(1); }, children: [_jsx(SelectTrigger, { className: "w-40 h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Any substate" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Any substate" }), subStateOptions.map((s) => _jsx(SelectItem, { value: s, children: s }, s))] })] }))] }))] }), _jsx("div", { ref: parentRef, className: "flex-1 overflow-y-auto", children: isLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(LoadingSpinner, {}) })) : docs.length === 0 ? (_jsx(EmptyState, { icon: FileText, title: "No documents", description: "Create your first document to get started.", action: _jsx(Button, { onClick: () => navigate(`/${workspaceId}/sa/${superAppId}/documents/new`), children: "New Document" }) })) : (_jsx("div", { style: { height: `${virtualizer.getTotalSize()}px`, position: 'relative' }, children: virtualizer.getVirtualItems().map((vItem) => {
                        const doc = docs[vItem.index];
                        return (_jsxs("div", { style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${vItem.size}px`,
                                transform: `translateY(${vItem.start}px)`,
                            }, className: "flex items-center gap-4 border-b px-6 hover:bg-accent/40 cursor-pointer transition-colors", onClick: () => navigate(`/${workspaceId}/sa/${superAppId}/documents/${doc._id}`), children: [_jsx(FileText, { className: "h-4 w-4 shrink-0 text-muted-foreground" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium font-mono truncate", children: doc._id }), _jsx("p", { className: "text-xs text-muted-foreground", children: doc._local?.smId ?? '' })] }), _jsx(StateBadge, { state: doc._local?.state ?? '', subState: doc._local?.subState ?? undefined }), _jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: doc._local?.timestamp
                                        ? formatRelative(doc._local.timestamp)
                                        : '' })] }, doc._id));
                    }) })) }), data && data.total > PAGE_SIZE && (_jsxs("div", { className: "flex items-center justify-between border-t px-6 py-3", children: [_jsxs("span", { className: "text-xs text-muted-foreground", children: ["Page ", page, " of ", Math.ceil(data.total / PAGE_SIZE)] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: page === 1, onClick: () => setPage((p) => p - 1), children: "Previous" }), _jsx(Button, { variant: "outline", size: "sm", disabled: page >= Math.ceil(data.total / PAGE_SIZE), onClick: () => setPage((p) => p + 1), children: "Next" })] })] }))] }));
}
