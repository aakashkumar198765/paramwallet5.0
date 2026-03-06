import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspaces, createWorkspace, listPlants, createPlant, listInstalledSuperApps, installSuperApp, listOrgs, onboardPartner, listUsers, addUser, } from '@/api/workspace.api';
import { useWorkspaceStore } from '@/store/workspace.store';
export const workspaceKeys = {
    all: ['workspaces'],
    list: () => [...workspaceKeys.all, 'list'],
    plants: (ws) => ['plants', ws],
    superApps: (ws) => ['superApps', ws],
    orgs: (ws, saId) => ['orgs', ws, saId],
    users: (ws, saId) => ['users', ws, saId],
};
export function useWorkspaces() {
    return useQuery({
        queryKey: workspaceKeys.list(),
        queryFn: async () => {
            const res = await listWorkspaces();
            return res.workspaces;
        },
    });
}
export function useCreateWorkspace() {
    const qc = useQueryClient();
    const { setWorkspaceList } = useWorkspaceStore();
    return useMutation({
        mutationFn: createWorkspace,
        onSuccess: async () => {
            const res = await listWorkspaces();
            setWorkspaceList(res.workspaces);
            qc.invalidateQueries({ queryKey: workspaceKeys.list() });
        },
    });
}
export function usePlants(workspaceSubdomain) {
    return useQuery({
        queryKey: workspaceKeys.plants(workspaceSubdomain),
        queryFn: async () => {
            const res = await listPlants();
            return res.plants;
        },
        enabled: !!workspaceSubdomain,
    });
}
export function useCreatePlant(workspaceSubdomain) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => createPlant(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceSubdomain) }),
    });
}
export function useInstalledSuperApps(workspaceSubdomain) {
    return useQuery({
        queryKey: workspaceKeys.superApps(workspaceSubdomain),
        queryFn: async () => {
            const res = await listInstalledSuperApps();
            return res.superapps;
        },
        enabled: !!workspaceSubdomain,
    });
}
export function useInstallSuperApp(workspaceSubdomain) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (superAppId) => installSuperApp(superAppId),
        onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.superApps(workspaceSubdomain) }),
    });
}
export function useOrgs(workspaceSubdomain, superAppId) {
    return useQuery({
        queryKey: workspaceKeys.orgs(workspaceSubdomain, superAppId),
        queryFn: async () => {
            const res = await listOrgs(superAppId);
            return res.organizations;
        },
        enabled: !!workspaceSubdomain && !!superAppId,
    });
}
export function useOnboardPartner(workspaceSubdomain, superAppId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => onboardPartner(superAppId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.orgs(workspaceSubdomain, superAppId) }),
    });
}
export function useUsers(workspaceSubdomain, superAppId, role) {
    return useQuery({
        queryKey: workspaceKeys.users(workspaceSubdomain, superAppId),
        queryFn: async () => {
            const res = await listUsers(superAppId, role ?? '');
            return res.users;
        },
        enabled: !!workspaceSubdomain && !!superAppId,
    });
}
export function useAddUser(workspaceSubdomain, superAppId, role) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => addUser(superAppId, role, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.users(workspaceSubdomain, superAppId) }),
    });
}
