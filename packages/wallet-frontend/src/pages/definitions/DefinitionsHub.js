import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
];
export function DefinitionsHub() {
    const { workspaceId } = useParams();
    const [tab, setTab] = useState('superapp');
    const ws = workspaceId ?? '';
    return (_jsxs("div", { className: "p-6 space-y-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Definitions" }), _jsxs(Tabs, { value: tab, onValueChange: setTab, children: [_jsx(TabsList, { className: "flex-wrap h-auto gap-1", children: TABS.map((t) => (_jsx(TabsTrigger, { value: t.value, className: "text-xs", children: t.label }, t.value))) }), _jsx(TabsContent, { value: "superapp", children: _jsx(SuperAppDefsTab, { ws: ws }) }), _jsx(TabsContent, { value: "onchain-sm", children: _jsx(OnchainSMTab, { ws: ws }) }), _jsx(TabsContent, { value: "onchain-schema", children: _jsx(OnchainSchemaTab, { ws: ws }) }), _jsx(TabsContent, { value: "offchain-sm", children: _jsx(OffchainSMTab, { ws: ws }) }), _jsx(TabsContent, { value: "offchain-schema", children: _jsx(OffchainSchemaTab, { ws: ws }) }), _jsx(TabsContent, { value: "rbac", children: _jsx(RbacMatrixTab, { ws: ws }) })] })] }));
}
