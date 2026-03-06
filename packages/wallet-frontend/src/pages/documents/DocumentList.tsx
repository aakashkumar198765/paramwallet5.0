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
import type { DocumentListParams } from '@/types/documents';

const PAGE_SIZE = 50;

export function DocumentList() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
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

  const params: DocumentListParams = {
    superAppId: superAppId ?? '',
    smId: activeDocType ?? undefined,
    state: filterState || undefined,
    subState: filterSubState || undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useDocuments(workspaceId ?? '', superAppId ?? '', params);

  const parentRef = useRef<HTMLDivElement>(null);
  const docs = data?.documents ?? [];

  const virtualizer = useVirtualizer({
    count: docs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  const docTypes = activeSuperApp?.linkedSMs ?? [];

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{activeSuperApp?.name ?? 'Documents'}</h1>
          <p className="text-xs text-muted-foreground">
            {data?.total ?? 0} documents
            {isFetching && !isLoading && (
              <span className="ml-2 text-muted-foreground">Refreshing…</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/${workspaceId}/sa/${superAppId}/documents/new`)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* SM / doc-type tabs */}
      {docTypes.length > 1 && (
        <div className="border-b px-6 py-2">
          <Tabs
            value={activeDocType ?? 'all'}
            onValueChange={(v) => {
              setActiveDocType(v === 'all' ? null : v);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              {docTypes.map((dt) => (
                <TabsTrigger key={dt} value={dt} className="text-xs">{dt}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Search + Filters */}
      <div className="border-b px-6 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search documents…" className="pl-8" value={search} onChange={handleSearch} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => setShowFilters((f) => !f)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 h-9 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />Clear
            </Button>
          )}
        </div>
        {showFilters && (
          <div className="flex items-center gap-3 pt-1">
            <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterSubState(''); setPage(1); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Any state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any state</SelectItem>
                {stateOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {subStateOptions.length > 0 && (
              <Select value={filterSubState} onValueChange={(v) => { setFilterSubState(v); setPage(1); }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Any substate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any substate</SelectItem>
                  {subStateOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Virtual list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Create your first document to get started."
            action={
              <Button onClick={() => navigate(`/${workspaceId}/sa/${superAppId}/documents/new`)}>
                New Document
              </Button>
            }
          />
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((vItem) => {
              const doc = docs[vItem.index];
              return (
                <div
                  key={doc._id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${vItem.size}px`,
                    transform: `translateY(${vItem.start}px)`,
                  }}
                  className="flex items-center gap-4 border-b px-6 hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() =>
                    navigate(`/${workspaceId}/sa/${superAppId}/documents/${doc._id}`)
                  }
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono truncate">{doc._id}</p>
                    <p className="text-xs text-muted-foreground">{doc._local?.smId ?? ''}</p>
                  </div>
                  <StateBadge
                    state={doc._local?.state ?? ''}
                    subState={doc._local?.subState ?? undefined}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {doc._local?.timestamp
                      ? formatRelative(doc._local.timestamp)
                      : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <span className="text-xs text-muted-foreground">
            Page {page} of {Math.ceil(data.total / PAGE_SIZE)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
