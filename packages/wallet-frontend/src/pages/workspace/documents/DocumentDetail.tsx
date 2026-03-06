import { useParams, useNavigate } from 'react-router-dom';
import { useDocument } from '@/hooks/useDocuments';
import { useActions } from '@/hooks/useActions';
import { useDiff } from '@/hooks/useDiff';
import { ActionButtons } from '@/components/documents/ActionButtons';
import { DiffView } from '@/components/documents/DiffView';
import { StateBadge } from '@/components/shared/StateBadge';
import { PhaseBadge } from '@/components/shared/PhaseBadge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RightPanel } from '@/components/layout/RightPanel';
import { useToast } from '@/components/ui/use-toast';
import { useTransitionDocument } from '@/hooks/useDocuments';
import { formatDate } from '@/lib/utils';
import { transitionDocument as pgTransitionDocument } from '@/api/paramgateway/stubs/documentTransition';
import { ArrowLeft, Link } from 'lucide-react';
import type { DocumentAction } from '@/types/documents';

export default function DocumentDetail() {
  const { subdomain, superAppId, docId } = useParams<{
    subdomain: string;
    superAppId: string;
    docId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const smId = new URLSearchParams(location.search).get('sm') ?? '';

  const { data: doc, isLoading: docLoading } = useDocument(subdomain!, superAppId!, smId, docId!);
  const { data: actions } = useActions(subdomain!, superAppId!, smId, docId!);
  const { data: diff, isLoading: diffLoading } = useDiff(subdomain!, superAppId!, smId, docId!);
  const transition = useTransitionDocument(subdomain!, superAppId!, smId, docId!);

  const handleAction = async (action: DocumentAction) => {
    try {
      // ParamGateway stub
      await pgTransitionDocument(action.pipelineId, { docId, action });
      // Then update via backend
      await transition.mutateAsync({
        targetState: action.targetState,
        targetSubState: action.targetSubState,
        targetMicroState: action.targetMicroState,
      });
      toast({ title: 'Action applied', description: `Moved to ${action.targetState}` });
    } catch {
      toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  if (docLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!doc) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">Document not found</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(`/workspace/${subdomain}/${superAppId}/documents`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StateBadge
                state={doc._local.state}
                subState={doc._local.subState}
                microState={doc._local.microState}
              />
              {doc._local.phase && <PhaseBadge phase={doc._local.phase} />}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{doc._id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`/workspace/${subdomain}/${superAppId}/documents/${docId}/chain`)
            }
          >
            <Link className="mr-2 h-3 w-3" />
            Chain
          </Button>
        </div>

        {/* Action buttons */}
        {actions && (
          <div className="mb-4 rounded-lg border p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Actions</p>
            <ActionButtons
              availableActions={actions.availableActions}
              alternateNextActions={actions.alternateNextActions}
              linkedSmActions={actions.linkedSmActions}
              onAction={handleAction}
              loading={transition.isPending}
            />
          </div>
        )}

        <Tabs defaultValue="data" className="flex-1">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="chain">Chain Info</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="mt-4">
            <JsonViewer data={doc} />
          </TabsContent>
          <TabsContent value="chain" className="mt-4 space-y-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Roles</p>
              <div className="space-y-1">
                {Object.entries(doc._chain.roles).map(([role, info]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{role}</span>
                    <span className="text-muted-foreground">{info.name} ({info.paramId})</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Updated</p>
              <p className="text-sm">{formatDate(doc._local.timestamp)}</p>
            </div>
          </TabsContent>
          <TabsContent value="diff" className="mt-4">
            <DiffView diff={diff} isLoading={diffLoading} />
          </TabsContent>
          <TabsContent value="raw" className="mt-4">
            <JsonViewer data={doc} />
          </TabsContent>
        </Tabs>
      </div>

      <RightPanel title="Document Info">
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">ID</p>
            <p className="font-mono text-xs break-all">{doc._id}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">State</p>
            <StateBadge state={doc._local.state} />
          </div>
          {doc._local.subState && (
            <div>
              <p className="text-xs text-muted-foreground">Sub State</p>
              <p>{doc._local.subState}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Phase</p>
            {doc._local.phase ? <PhaseBadge phase={doc._local.phase} /> : <p>-</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p>{formatDate(doc._local.timestamp)}</p>
          </div>
          {doc.access && (
            <div>
              <p className="text-xs text-muted-foreground">Access</p>
              <p className="font-semibold">{doc.access}</p>
            </div>
          )}
        </div>
      </RightPanel>
    </div>
  );
}
