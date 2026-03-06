import { FileCode } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

// Backend provides only GET /definitions/offchain-schemas/:id (no list endpoint)
export function OffchainSchemaTab({ ws: _ }: { ws: string }) {
  return (
    <EmptyState
      icon={FileCode}
      title="Offchain schemas"
      description="Select a specific offchain schema by ID to view its definition."
    />
  );
}
