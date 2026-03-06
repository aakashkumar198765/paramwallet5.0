import { useState, useRef, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StateBadge } from '@/components/shared/StateBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { SmDocument } from '@/types/documents';
import type { SchemaDefinition } from '@/types/definitions';
import { getPrimaryFields } from '@/lib/schema';

interface DocumentTableProps {
  documents: SmDocument[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onRowClick: (doc: SmDocument) => void;
  selectedDocId?: string;
  schema?: SchemaDefinition | null;
}

export function DocumentTable({
  documents,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  onSearch,
  onRowClick,
  selectedDocId,
  schema,
}: DocumentTableProps) {
  const [searchValue, setSearchValue] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchValue(val);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => onSearch(val), 300);
    },
    [onSearch]
  );

  const primaryFields = getPrimaryFields(schema);

  const dynamicColumns: ColumnDef<SmDocument>[] = primaryFields.map(([groupKey, fieldKey, field]) => ({
    id: `${groupKey}.${fieldKey}`,
    header: field.title ?? fieldKey,
    accessorFn: (row) => {
      const group = row[groupKey] as Record<string, unknown> | undefined;
      return group?.[fieldKey] ?? '-';
    },
    cell: ({ getValue }) => (
      <span className="truncate">{String(getValue() ?? '-')}</span>
    ),
  }));

  const columns: ColumnDef<SmDocument>[] = [
    {
      id: 'state',
      header: 'State',
      cell: ({ row }) => (
        <StateBadge
          state={row.original._local.state}
          subState={row.original._local.subState}
        />
      ),
    },
    ...dynamicColumns,
    {
      id: 'updatedAt',
      header: 'Updated',
      accessorFn: (row) => row._local.timestamp,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(getValue() as number)}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchValue}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <div className="rounded-md border">
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
        </div>

        <div ref={parentRef} className="max-h-[calc(100vh-320px)] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner text="Loading documents..." />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              title="No documents found"
              description="Create your first document to get started."
              className="border-none"
            />
          ) : (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((vrow) => {
                const row = table.getRowModel().rows[vrow.index];
                const doc = documents[vrow.index];
                return (
                  <div
                    key={vrow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${vrow.size}px`,
                      transform: `translateY(${vrow.start}px)`,
                    }}
                  >
                    <table className="w-full">
                      <tbody>
                        <tr
                          className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                            doc._id === selectedDocId ? 'bg-muted' : ''
                          }`}
                          onClick={() => onRowClick(doc)}
                        >
                          {row?.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-4 align-middle">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
