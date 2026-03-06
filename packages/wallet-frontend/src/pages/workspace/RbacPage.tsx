import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Save, Plus, Trash2 } from 'lucide-react';
import { useRbacMatrix, useCreateRbacMatrix, useUpdateRbacMatrix } from '@/hooks/use-definitions';
import { useSuperAppStore } from '@/store/superapp.store';
import { useSMs } from '@/hooks/use-definitions';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { TeamRbacEntry, TeamRbacMatrix } from '@/types/definitions';
import type { AccessLevel } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const ACCESS_CYCLE: AccessLevel[] = ['N/A', 'RO', 'RW'];

function nextAccess(current: string): AccessLevel {
  const idx = ACCESS_CYCLE.indexOf(current as AccessLevel);
  return ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length];
}

interface MatrixEditorProps {
  matrix: TeamRbacMatrix;
  onSave: (permissions: TeamRbacEntry[]) => Promise<void>;
  saving: boolean;
}

function MatrixEditor({ matrix, onSave, saving }: MatrixEditorProps) {
  const [permissions, setPermissions] = useState<TeamRbacEntry[]>(
    matrix.permissions.map((p) => ({ ...p, access: { ...p.access } }))
  );
  const [dirty, setDirty] = useState(false);
  const [newState, setNewState] = useState('');
  const [newSubState, setNewSubState] = useState('');

  const roleTeamKeys = Array.from(
    new Set(permissions.flatMap((p) => Object.keys(p.access)))
  );

  const [newRoleTeam, setNewRoleTeam] = useState('');

  const toggleCell = useCallback(
    (rowIdx: number, key: string) => {
      setPermissions((prev) => {
        const copy = prev.map((p, i) =>
          i === rowIdx
            ? { ...p, access: { ...p.access, [key]: nextAccess(p.access[key] ?? 'N/A') } }
            : p
        );
        return copy;
      });
      setDirty(true);
    },
    []
  );

  const addRow = () => {
    if (!newState.trim()) return;
    setPermissions((prev) => [
      ...prev,
      {
        state: newState.trim(),
        subState: newSubState.trim() || null,
        microState: null,
        access: Object.fromEntries(roleTeamKeys.map((k) => [k, 'N/A' as AccessLevel])),
      },
    ]);
    setNewState('');
    setNewSubState('');
    setDirty(true);
  };

  const removeRow = (idx: number) => {
    setPermissions((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const addColumn = () => {
    const key = newRoleTeam.trim();
    if (!key || roleTeamKeys.includes(key)) return;
    setPermissions((prev) =>
      prev.map((p) => ({ ...p, access: { ...p.access, [key]: 'N/A' as AccessLevel } }))
    );
    setNewRoleTeam('');
    setDirty(true);
  };

  const removeColumn = (key: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        const { [key]: _removed, ...rest } = p.access;
        return { ...p, access: rest };
      })
    );
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Click any cell to cycle: <strong>N/A → RO → RW → N/A</strong>
        </p>
        <Button
          size="sm"
          disabled={!dirty || saving}
          onClick={() => onSave(permissions).then(() => setDirty(false))}
        >
          {saving ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Save Matrix
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32 sticky left-0 bg-muted/40">State</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32">SubState</th>
              {roleTeamKeys.map((key) => (
                <th key={key} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-center">
                    {key}
                    <button
                      className="text-destructive/60 hover:text-destructive ml-1"
                      onClick={() => removeColumn(key)}
                      title={`Remove column ${key}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-10">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-mono text-xs font-medium sticky left-0 bg-background">{perm.state}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{perm.subState ?? '—'}</td>
                {roleTeamKeys.map((key) => (
                  <td key={key} className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleCell(idx, key)}
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-semibold transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1',
                        (perm.access[key] as AccessLevel) === 'RW' && 'bg-green-500/15 text-green-700 dark:text-green-400',
                        (perm.access[key] as AccessLevel) === 'RO' && 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
                        (!perm.access[key] || (perm.access[key] as AccessLevel) === 'N/A') && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {(perm.access[key] as AccessLevel) ?? 'N/A'}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Add row */}
            <tr className="border-b bg-muted/10">
              <td className="px-2 py-2">
                <Input
                  placeholder="state"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="subState (opt)"
                  value={newSubState}
                  onChange={(e) => setNewSubState(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </td>
              <td colSpan={roleTeamKeys.length + 1} className="px-2 py-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addRow} disabled={!newState.trim()}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Row
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add column */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="role.team (e.g. buyer.procurement)"
          value={newRoleTeam}
          onChange={(e) => setNewRoleTeam(e.target.value)}
          className="h-8 text-xs max-w-xs font-mono"
        />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addColumn} disabled={!newRoleTeam.trim()}>
          <Plus className="mr-1 h-3 w-3" />
          Add Column
        </Button>
      </div>
    </div>
  );
}

export function RbacPage() {
  const { workspaceId, superAppId } = useParams<{ workspaceId: string; superAppId: string }>();
  const { activeSuperApp } = useSuperAppStore();

  const saId = superAppId ?? activeSuperApp?.paramId ?? '';
  const { data: sms } = useSMs(workspaceId ?? '');
  const [selectedSmId, setSelectedSmId] = useState('');

  const smId = selectedSmId;
  const { data: matrix, isLoading } = useRbacMatrix(workspaceId ?? '', saId);
  const createMatrix = useCreateRbacMatrix(workspaceId ?? '', saId);
  const updateMatrix = useUpdateRbacMatrix(workspaceId ?? '', saId, smId);

  const linkedSMs = activeSuperApp?.linkedSMs ?? [];
  const availableSMs = sms?.filter((sm) => linkedSMs.includes(sm._id)) ?? [];

  const handleSave = async (permissions: TeamRbacEntry[]) => {
    try {
      if (matrix) {
        await updateMatrix.mutateAsync({ permissions });
      } else {
        const smName = availableSMs.find((s) => s._id === smId)?.name ?? smId;
        await createMatrix.mutateAsync({ superAppId: saId, smId, smName, permissions });
      }
      toast({ title: 'RBAC matrix saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save matrix' });
      throw new Error('save failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Team RBAC Matrix</h1>
        <p className="text-sm text-muted-foreground">
          Define state-level access for each role × team combination. Click a cell to cycle N/A → RO → RW.
        </p>
      </div>

      {/* SM selector */}
      {availableSMs.length > 0 && (
        <div className="flex items-center gap-3">
          <Select value={selectedSmId} onValueChange={setSelectedSmId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select state machine" />
            </SelectTrigger>
            <SelectContent>
              {availableSMs.map((sm) => (
                <SelectItem key={sm._id} value={sm._id}>{sm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : !matrix ? (
        <EmptyState
          icon={ShieldCheck}
          title="No RBAC matrix defined"
          description="Create a matrix to control state-level access for each role and team."
          action={
            <Button onClick={() => handleSave([])}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Matrix
            </Button>
          }
        />
      ) : (
        <MatrixEditor
          matrix={matrix}
          onSave={handleSave}
          saving={createMatrix.isPending || updateMatrix.isPending}
        />
      )}
    </div>
  );
}
