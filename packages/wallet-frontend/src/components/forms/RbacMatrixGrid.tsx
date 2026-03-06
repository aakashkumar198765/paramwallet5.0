import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccessBadge } from '@/components/shared/AccessBadge';
import type { TeamRbacMatrix } from '@/types/definitions';
import { cn } from '@/lib/utils';

interface RbacMatrixGridProps {
  matrix: TeamRbacMatrix;
  roleTeams: Array<{ role: string; team: string }>;
  onSave: (updated: TeamRbacMatrix) => void;
  isLoading?: boolean;
}

type AccessLevel = 'RW' | 'RO' | 'N/A';

const accessOptions: AccessLevel[] = ['RW', 'RO', 'N/A'];

const accessCellClass: Record<AccessLevel, string> = {
  RW: 'bg-green-50 dark:bg-green-950',
  RO: 'bg-blue-50 dark:bg-blue-950',
  'N/A': 'bg-red-50 dark:bg-red-950',
};

export function RbacMatrixGrid({ matrix, roleTeams, onSave, isLoading }: RbacMatrixGridProps) {
  const [permissions, setPermissions] = useState(matrix.permissions);

  const updateAccess = (permIdx: number, key: string, value: AccessLevel) => {
    setPermissions((prev) =>
      prev.map((p, i) =>
        i === permIdx ? { ...p, access: { ...p.access, [key]: value } } : p
      )
    );
  };

  const handleSave = () => {
    onSave({ ...matrix, permissions });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">State</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sub State</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Micro State</th>
              {roleTeams.map((rt) => (
                <th key={`${rt.role}.${rt.team}`} className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                  <div className="text-xs">{rt.role}</div>
                  <div className="text-xs text-muted-foreground">{rt.team}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm, permIdx) => (
              <tr key={permIdx} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{perm.state}</td>
                <td className="px-3 py-2 text-muted-foreground">{perm.subState ?? '-'}</td>
                <td className="px-3 py-2 text-muted-foreground">{perm.microState ?? '-'}</td>
                {roleTeams.map((rt) => {
                  const key = `${rt.role}.${rt.team}`;
                  const current = (perm.access[key] ?? 'N/A') as AccessLevel;
                  return (
                    <td
                      key={key}
                      className={cn('px-2 py-1 text-center', accessCellClass[current])}
                    >
                      <Select
                        value={current}
                        onValueChange={(v) => updateAccess(permIdx, key, v as AccessLevel)}
                      >
                        <SelectTrigger className="h-7 w-20 border-none bg-transparent text-xs focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {accessOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              <AccessBadge access={opt} showIcon={false} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save RBAC Matrix'}
      </Button>
    </div>
  );
}
