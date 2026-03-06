import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSuperAppDefs } from '@/hooks/use-definitions';
import { useRbacMatrix } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AccessBadge } from '@/components/shared/AccessBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AccessLevel } from '@/lib/rbac';

export function RbacMatrixTab({ ws }: { ws: string }) {
  const [selectedSaId, setSelectedSaId] = useState('');

  const { data: superAppDefs, isLoading: loadingDefs } = useSuperAppDefs(ws);
  const { data: matrix, isLoading: loadingMatrix } = useRbacMatrix(ws, selectedSaId);

  if (loadingDefs) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (!superAppDefs?.length)
    return <EmptyState icon={ShieldCheck} title="No SuperApp definitions found" />;

  // Collect all unique role.team keys from matrix permissions
  const roleTeamKeys = matrix
    ? Array.from(new Set(matrix.permissions.flatMap((p) => Object.keys(p.access))))
    : [];

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-3">
        <Select value={selectedSaId} onValueChange={setSelectedSaId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select SuperApp definition" />
          </SelectTrigger>
          <SelectContent>
            {superAppDefs.map((sa) => (
              <SelectItem key={sa._id} value={sa._id}>
                {sa.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSaId ? (
        <EmptyState icon={ShieldCheck} title="Select a SuperApp to view its RBAC matrix" />
      ) : loadingMatrix ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : !matrix ? (
        <EmptyState icon={ShieldCheck} title="No RBAC matrix defined" description="Create one to control state-level access." />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">State</TableHead>
                <TableHead className="sticky left-0 bg-background">SubState</TableHead>
                {roleTeamKeys.map((key) => (
                  <TableHead key={key} className="text-xs whitespace-nowrap">{key}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.permissions.map((perm, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{perm.state}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {perm.subState ?? '—'}
                  </TableCell>
                  {roleTeamKeys.map((key) => (
                    <TableCell key={key}>
                      <AccessBadge access={(perm.access[key] as AccessLevel) ?? 'N/A'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
