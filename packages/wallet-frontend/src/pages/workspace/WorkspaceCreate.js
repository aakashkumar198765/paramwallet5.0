import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceStore } from '@/store/workspace.store';
import { toast } from '@/hooks/use-toast';
const schema = z.object({
    workspaceName: z.string().min(2, 'Name must be at least 2 characters'),
    subdomain: z
        .string()
        .min(3, 'Subdomain must be at least 3 characters')
        .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
    exchangeParamId: z.string().min(1, 'Exchange Param ID is required'),
});
export function WorkspaceCreate() {
    const navigate = useNavigate();
    const { setActiveWorkspace } = useWorkspaceStore();
    const createWorkspace = useCreateWorkspace();
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
    });
    const onSubmit = async (data) => {
        try {
            await createWorkspace.mutateAsync(data);
            setActiveWorkspace(data.subdomain);
            toast({ title: 'Workspace created' });
            navigate(`/${data.subdomain}`);
        }
        catch {
            toast({ variant: 'destructive', title: 'Failed to create workspace' });
        }
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: _jsxs("div", { className: "w-full max-w-sm space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold", children: "Create workspace" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Set up a new Param Wallet workspace" })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "workspaceName", children: "Workspace name" }), _jsx(Input, { id: "workspaceName", placeholder: "Acme Corp", ...register('workspaceName') }), errors.workspaceName && (_jsx("p", { className: "text-xs text-destructive", children: errors.workspaceName.message }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "subdomain", children: "Subdomain" }), _jsx(Input, { id: "subdomain", placeholder: "acme-corp", ...register('subdomain') }), errors.subdomain && (_jsx("p", { className: "text-xs text-destructive", children: errors.subdomain.message }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "exchangeParamId", children: "Exchange Param ID" }), _jsx(Input, { id: "exchangeParamId", placeholder: "PARAM_...", ...register('exchangeParamId') }), errors.exchangeParamId && (_jsx("p", { className: "text-xs text-destructive", children: errors.exchangeParamId.message }))] }), _jsx(Button, { type: "submit", className: "w-full", disabled: createWorkspace.isPending, children: createWorkspace.isPending ? 'Creating…' : 'Create workspace' }), _jsx(Button, { type: "button", variant: "ghost", className: "w-full", onClick: () => navigate(-1), children: "Cancel" })] })] }) }));
}
