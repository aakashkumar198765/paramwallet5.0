import { useState } from 'react';
import { GitBranch, Eye, Upload } from 'lucide-react';
import { useSMs } from '@/hooks/use-definitions';
import { deployOnchainSM } from '@/api/paramgateway/stubs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { OnchainSMDefinition } from '@/types/definitions';

export function OnchainSMTab({ ws }: { ws: string }) {
  const { data: sms, isLoading } = useSMs(ws);
  const [viewSM, setViewSM] = useState<OnchainSMDefinition | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const handleDeploy = async (sm: OnchainSMDefinition) => {
    setDeploying(sm._id);
    try {
      await deployOnchainSM({ smId: sm._id, name: sm.name, smType: sm.smType, states: sm.states });
      toast({ title: 'Deploy submitted (stub)', description: `${sm.name} → ParamGateway` });
    } catch {
      toast({ variant: 'destructive', title: 'Deploy failed' });
    } finally {
      setDeploying(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  if (!sms?.length) return <EmptyState icon={GitBranch} title="No onchain state machines" />;

  return (
    <div className="space-y-2 mt-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Start State</TableHead>
              <TableHead>States</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sms.map((sm) => (
              <TableRow key={sm._id}>
                <TableCell className="font-medium">{sm.name}</TableCell>
                <TableCell className="text-xs">{sm.smType}</TableCell>
                <TableCell className="font-mono text-xs">{sm.startAt}</TableCell>
                <TableCell>{Object.keys(sm.states).length}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(sm.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setViewSM(sm)}>
                      <Eye className="h-3 w-3" />View
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={deploying === sm._id} onClick={() => handleDeploy(sm)}>
                      {deploying === sm._id ? <LoadingSpinner size="sm" /> : <Upload className="h-3 w-3" />}Deploy
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!viewSM} onOpenChange={(o) => { if (!o) setViewSM(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{viewSM?.name}</DialogTitle></DialogHeader>
          {viewSM && <JsonViewer data={viewSM} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
