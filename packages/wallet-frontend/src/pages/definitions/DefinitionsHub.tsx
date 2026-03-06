import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuperAppDefsTab } from './tabs/SuperAppDefsTab';
import { OnchainSMTab } from './tabs/OnchainSMTab';
import { OnchainSchemaTab } from './tabs/OnchainSchemaTab';
import { OffchainSMTab } from './tabs/OffchainSMTab';
import { OffchainSchemaTab } from './tabs/OffchainSchemaTab';
import { RbacMatrixTab } from './tabs/RbacMatrixTab';

const TABS = [
  { value: 'superapp', label: 'SuperApp Defs' },
  { value: 'onchain-sm', label: 'Onchain SM' },
  { value: 'onchain-schema', label: 'Onchain Schema' },
  { value: 'offchain-sm', label: 'Offchain SM' },
  { value: 'offchain-schema', label: 'Offchain Schema' },
  { value: 'rbac', label: 'Team RBAC' },
] as const;

export function DefinitionsHub() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tab, setTab] = useState<string>('superapp');
  const ws = workspaceId ?? '';

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Definitions</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="superapp"><SuperAppDefsTab ws={ws} /></TabsContent>
        <TabsContent value="onchain-sm"><OnchainSMTab ws={ws} /></TabsContent>
        <TabsContent value="onchain-schema"><OnchainSchemaTab ws={ws} /></TabsContent>
        <TabsContent value="offchain-sm"><OffchainSMTab ws={ws} /></TabsContent>
        <TabsContent value="offchain-schema"><OffchainSchemaTab ws={ws} /></TabsContent>
        <TabsContent value="rbac"><RbacMatrixTab ws={ws} /></TabsContent>
      </Tabs>
    </div>
  );
}
