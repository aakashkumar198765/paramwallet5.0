import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { FileJson, Eye, Upload } from 'lucide-react';
import { useSchemas } from '@/hooks/use-definitions';
import { deployOnchainSchema } from '@/api/paramgateway/stubs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JsonViewer } from '@/components/shared/JsonViewer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
export function OnchainSchemaTab({ ws }) {
    const { data: schemas, isLoading } = useSchemas(ws);
    const [viewSchema, setViewSchema] = useState(null);
    const [deploying, setDeploying] = useState(null);
    const handleDeploy = async (schema) => {
        setDeploying(schema._id);
        try {
            await deployOnchainSchema({ schemaId: schema._id, name: schema.name, version: schema.version, properties: schema.properties });
            toast({ title: 'Deploy submitted (stub)', description: `${schema.name} → ParamGateway` });
        }
        catch {
            toast({ variant: 'destructive', title: 'Deploy failed' });
        }
        finally {
            setDeploying(null);
        }
    };
    if (isLoading)
        return _jsx("div", { className: "flex justify-center py-8", children: _jsx(LoadingSpinner, {}) });
    if (!schemas?.length)
        return _jsx(EmptyState, { icon: FileJson, title: "No onchain schemas" });
    return (_jsxs("div", { className: "space-y-2 mt-2", children: [_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Version" }), _jsx(TableHead, { children: "Fields" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: schemas.map((schema) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: schema.name }), _jsx(TableCell, { className: "font-mono text-xs", children: schema.version }), _jsx(TableCell, { children: Object.keys(schema.properties).length }), _jsx(TableCell, { className: "text-xs text-muted-foreground", children: formatDate(schema.createdAt) }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-xs gap-1", onClick: () => setViewSchema(schema), children: [_jsx(Eye, { className: "h-3 w-3" }), "View"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "h-7 text-xs gap-1", disabled: deploying === schema._id, onClick: () => handleDeploy(schema), children: [deploying === schema._id ? _jsx(LoadingSpinner, { size: "sm" }) : _jsx(Upload, { className: "h-3 w-3" }), "Deploy"] })] }) })] }, schema._id))) })] }) }), _jsx(Dialog, { open: !!viewSchema, onOpenChange: (o) => { if (!o)
                    setViewSchema(null); }, children: _jsxs(DialogContent, { className: "sm:max-w-2xl", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: [viewSchema?.name, " ", _jsxs("span", { className: "text-muted-foreground font-normal", children: ["v", viewSchema?.version] })] }) }), viewSchema && _jsx(JsonViewer, { data: viewSchema })] }) })] }));
}
