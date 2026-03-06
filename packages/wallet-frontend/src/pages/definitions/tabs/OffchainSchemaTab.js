import { jsx as _jsx } from "react/jsx-runtime";
import { FileCode } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
// Backend provides only GET /definitions/offchain-schemas/:id (no list endpoint)
export function OffchainSchemaTab({ ws: _ }) {
    return (_jsx(EmptyState, { icon: FileCode, title: "Offchain schemas", description: "Select a specific offchain schema by ID to view its definition." }));
}
