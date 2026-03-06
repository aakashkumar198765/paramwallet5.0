import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { SubstateTabBar } from '@/components/documents/SubstateTabBar';
import { RightPanel } from '@/components/layout/RightPanel';
import { Button } from '@/components/ui/button';
import { StateBadge } from '@/components/shared/StateBadge';
import { PhaseBadge } from '@/components/shared/PhaseBadge';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { formatDate } from '@/lib/utils';
import { Plus, ExternalLink } from 'lucide-react';
import type { SmDocument } from '@/types/documents';
import type { SmState } from '@/types/definitions';

export default function DocumentList() {
  const { subdomain, superAppId } = useParams<{ subdomain: string; superAppId: string }>();
  const navigate = useNavigate();
  const [activeSubState, setActiveSubState] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<SmDocument | null>(null);

  const smId = new URLSearchParams(location.search).get('sm') ?? '';

  const { data, isLoading } = useDocuments(smId, {
    subState: activeSubState ?? undefined,
    search,
    page,
    limit: 50,
  });

  // Placeholder SM state for substate tab bar
  const activeSmState: SmState | null = null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Substate tab bar */}
        <SubstateTabBar
          state={activeSmState}
          activeSubState={activeSubState}
          onSelect={(s) => {
            setActiveSubState(s);
            setPage(1);
          }}
        />

        <div className="flex flex-1 flex-col overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Documents</h2>
            <Button
              onClick={() =>
                navigate(`/workspace/${subdomain}/${superAppId}/documents/create`)
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Create
            </Button>
          </div>

          <DocumentTable
            documents={data?.documents ?? []}
            total={data?.total ?? 0}
            page={page}
            totalPages={Math.ceil((data?.total ?? 0) / 50) || 1}
            isLoading={isLoading}
            onPageChange={setPage}
            onSearch={(q) => {
              setSearch(q);
              setPage(1);
            }}
            onRowClick={setSelectedDoc}
            selectedDocId={selectedDoc?._id}
          />
        </div>
      </div>

      <RightPanel
        title={selectedDoc ? 'Document Detail' : 'Select a Document'}
        onClose={selectedDoc ? () => setSelectedDoc(null) : undefined}
      >
        {selectedDoc ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StateBadge
                state={selectedDoc._local.state}
                subState={selectedDoc._local.subState}
                microState={selectedDoc._local.microState}
              />
              {selectedDoc._local.phase && (
                <PhaseBadge phase={selectedDoc._local.phase} />
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-sm">{formatDate(selectedDoc._local.timestamp)}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Document ID</p>
              <p className="font-mono text-xs break-all">{selectedDoc._id}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    `/workspace/${subdomain}/${superAppId}/documents/${selectedDoc._id}`
                  )
                }
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Open Document
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/workspace/${subdomain}/${superAppId}/documents/${selectedDoc._id}/chain`
                  )
                }
              >
                View Chain
              </Button>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Preview</p>
              <JsonViewer data={selectedDoc} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a row to view document details.
          </p>
        )}
      </RightPanel>
    </div>
  );
}
