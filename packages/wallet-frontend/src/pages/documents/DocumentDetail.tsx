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
import type { Action } from '@/types/documents';

export function DocumentDetail() {
  const { workspaceId, superAppId, docId } = useParams<{
    workspaceId: string;
    superAppId: string;
    docId: string;
  }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState('data');
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const { data: doc, isLoading } = useDocument(workspaceId ?? '', superAppId ?? '', docId ?? '');
  const { data: actionsResult } = useDocumentActions(workspaceId ?? '', superAppId ?? '', docId ?? '');
  const { data: diff } = useDocumentDiff(workspaceId ?? '', superAppId ?? '', docId ?? '');
  const { data: chain } = useDocumentChain(workspaceId ?? '', superAppId ?? '', docId ?? '');

  const handleTransition = async (action: Action) => {
    if (!docId) return;
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
    } catch {
      toast({ variant: 'destructive', title: 'Transition failed' });
    } finally {
      setTransitioning(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  if (!doc) return <div className="p-6 text-muted-foreground">Document not found.</div>;

  const allActions = [
    ...(actionsResult?.availableActions ?? []),
    ...(actionsResult?.alternateNextActions ?? []),
    ...(actionsResult?.linkedSmActions ?? []),
  ];

  const isReadOnly = doc._access === 'RO';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium truncate">{doc._id}</p>
          <p className="text-xs text-muted-foreground">{doc._local?.smId}</p>
        </div>
        <StateBadge
          state={doc._local?.state ?? ''}
          subState={doc._local?.subState ?? undefined}
          microState={doc._local?.microState ?? undefined}
        />
        {isReadOnly && <Badge variant="secondary">Read Only</Badge>}
      </div>

      {/* Actions strip */}
      {!isReadOnly && allActions.length > 0 && (
        <div className="flex items-center gap-2 border-b px-6 py-3 overflow-x-auto">
          <span className="text-xs text-muted-foreground shrink-0">Transition:</span>
          {allActions.map((action) => (
            <Button
              key={`${action.targetState}-${action.targetSubState ?? ''}`}
              size="sm"
              variant="outline"
              className="shrink-0 gap-1"
              disabled={transitioning !== null}
              onClick={() => handleTransition(action)}
            >
              {transitioning === action.targetState ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="chain">Chain</TabsTrigger>
            <TabsTrigger value="diff" disabled={!diff}>Diff</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-4">
            <JsonViewer data={doc} />
          </TabsContent>

          <TabsContent value="chain" className="mt-4">
            {chain ? (
              <div className="space-y-3">
                {chain.chain.map((entry) => (
                  <div key={entry._id} className="rounded-md border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <StateBadge state={entry.stateTo} subState={entry.subStateTo ?? undefined} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.changeType} by {entry.actor}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No chain history.</div>
            )}
          </TabsContent>

          {diff && (
            <TabsContent value="diff" className="mt-4">
              <JsonViewer data={diff} />
            </TabsContent>
          )}

          <TabsContent value="history" className="mt-4">
            <JsonViewer data={doc._chain} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
