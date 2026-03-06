import { Routes, Route, useNavigate } from 'react-router-dom';
import OnchainSMList from './OnchainSM/OnchainSMList';
import OnchainSMDetail from './OnchainSM/OnchainSMDetail';
import OnchainSMForm from './OnchainSM/OnchainSMForm';
import OnchainSchemaList from './OnchainSchema/OnchainSchemaList';
import OnchainSchemaDetail from './OnchainSchema/OnchainSchemaDetail';
import OnchainSchemaForm from './OnchainSchema/OnchainSchemaForm';
import OffchainSMList from './OffchainSM/OffchainSMList';
import OffchainSMDetail from './OffchainSM/OffchainSMDetail';
import OffchainSMForm from './OffchainSM/OffchainSMForm';
import OffchainSchemaList from './OffchainSchema/OffchainSchemaList';
import OffchainSchemaDetail from './OffchainSchema/OffchainSchemaDetail';
import OffchainSchemaForm from './OffchainSchema/OffchainSchemaForm';
import SuperAppDefList from './SuperAppDefs/SuperAppDefList';
import SuperAppDefDetail from './SuperAppDefs/SuperAppDefDetail';
import SuperAppDefForm from './SuperAppDefs/SuperAppDefForm';
import RbacMatrixList from './TeamRbacMatrix/RbacMatrixList';
import RbacMatrixDetail from './TeamRbacMatrix/RbacMatrixDetail';
import RbacMatrixForm from './TeamRbacMatrix/RbacMatrixForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';

function DefinitionsHome() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        title="Definitions Hub"
        description="Select a category from the left nav to manage definitions."
        icon={<BookOpen className="h-10 w-10" />}
        action={{ label: 'Onchain State Machines', onClick: () => navigate('/definitions/onchain/sm') }}
      />
    </div>
  );
}

export default function DefinitionsHub() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Routes>
        <Route index element={<DefinitionsHome />} />
        <Route path="onchain/sm" element={<OnchainSMList />} />
        <Route path="onchain/sm/new" element={<OnchainSMForm />} />
        <Route path="onchain/sm/:id" element={<OnchainSMDetail />} />
        <Route path="onchain/sm/:id/edit" element={<OnchainSMForm />} />
        <Route path="onchain/schema" element={<OnchainSchemaList />} />
        <Route path="onchain/schema/new" element={<OnchainSchemaForm />} />
        <Route path="onchain/schema/:id" element={<OnchainSchemaDetail />} />
        <Route path="onchain/schema/:id/edit" element={<OnchainSchemaForm />} />
        <Route path="offchain/sm" element={<OffchainSMList />} />
        <Route path="offchain/sm/new" element={<OffchainSMForm />} />
        <Route path="offchain/sm/:id" element={<OffchainSMDetail />} />
        <Route path="offchain/sm/:id/edit" element={<OffchainSMForm />} />
        <Route path="offchain/schema" element={<OffchainSchemaList />} />
        <Route path="offchain/schema/new" element={<OffchainSchemaForm />} />
        <Route path="offchain/schema/:id" element={<OffchainSchemaDetail />} />
        <Route path="offchain/schema/:id/edit" element={<OffchainSchemaForm />} />
        <Route path="superapps" element={<SuperAppDefList />} />
        <Route path="superapps/new" element={<SuperAppDefForm />} />
        <Route path="superapps/:id" element={<SuperAppDefDetail />} />
        <Route path="superapps/:id/edit" element={<SuperAppDefForm />} />
        <Route path="rbac" element={<RbacMatrixList />} />
        <Route path="rbac/new" element={<RbacMatrixForm />} />
        <Route path="rbac/:id" element={<RbacMatrixDetail />} />
        <Route path="rbac/:id/edit" element={<RbacMatrixForm />} />
        <Route path="*" element={<DefinitionsHome />} />
      </Routes>
    </div>
  );
}
