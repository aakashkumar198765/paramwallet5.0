import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSuperAppDefs, getSuperAppDef, createSuperAppDef, updateSuperAppDef, listSMs, getSM, getSMStates, listSchemas, getSchema, listOffchainSMs, getOffchainSM, getOffchainSchema, getRbacMatrix, getRbacMatrixForSM, createRbacMatrix, updateRbacMatrix, } from '@/api/definitions.api';
export const defKeys = {
    superAppDefs: (ws) => ['superAppDefs', ws],
    superAppDef: (ws, id) => ['superAppDef', ws, id],
    sms: (ws) => ['sms', ws],
    sm: (ws, id) => ['sm', ws, id],
    smStates: (ws, id) => ['smStates', ws, id],
    schemas: (ws) => ['schemas', ws],
    schema: (ws, id) => ['schema', ws, id],
    offchainSMs: (ws) => ['offchainSMs', ws],
    offchainSM: (ws, id) => ['offchainSM', ws, id],
    offchainSchema: (ws, id) => ['offchainSchema', ws, id],
    rbac: (ws, saId) => ['rbac', ws, saId],
    rbacSm: (ws, saId, smId) => ['rbacSm', ws, saId, smId],
};
// ── SuperApp Definitions ──────────────────────────────────────────────────────
export function useSuperAppDefs(ws) {
    return useQuery({
        queryKey: defKeys.superAppDefs(ws),
        queryFn: async () => { const r = await listSuperAppDefs(); return r.superapps; },
        enabled: !!ws,
    });
}
export function useSuperAppDef(ws, id) {
    return useQuery({
        queryKey: defKeys.superAppDef(ws, id),
        queryFn: () => getSuperAppDef(id),
        enabled: !!ws && !!id,
    });
}
export function useCreateSuperAppDef(ws) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createSuperAppDef,
        onSuccess: () => qc.invalidateQueries({ queryKey: defKeys.superAppDefs(ws) }),
    });
}
export function useUpdateSuperAppDef(ws, id) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body) => updateSuperAppDef(id, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: defKeys.superAppDefs(ws) });
            qc.invalidateQueries({ queryKey: defKeys.superAppDef(ws, id) });
        },
    });
}
// ── SM Definitions — backend returns { sms: [] } ─────────────────────────────
export function useSMs(ws) {
    return useQuery({
        queryKey: defKeys.sms(ws),
        queryFn: async () => { const r = await listSMs(); return r.sms; },
        enabled: !!ws,
    });
}
export function useSM(ws, id) {
    return useQuery({
        queryKey: defKeys.sm(ws, id),
        queryFn: () => getSM(id),
        enabled: !!ws && !!id,
    });
}
export function useSMStates(ws, id) {
    return useQuery({
        queryKey: defKeys.smStates(ws, id),
        queryFn: () => getSMStates(id),
        enabled: !!ws && !!id,
    });
}
// ── Schema Definitions — backend returns { schemas: [] } ─────────────────────
export function useSchemas(ws) {
    return useQuery({
        queryKey: defKeys.schemas(ws),
        queryFn: async () => { const r = await listSchemas(); return r.schemas; },
        enabled: !!ws,
    });
}
export function useSchema(ws, id) {
    return useQuery({
        queryKey: defKeys.schema(ws, id),
        queryFn: () => getSchema(id),
        enabled: !!ws && !!id,
    });
}
// ── Offchain SM Definitions — backend returns { offchainSms: [] } ────────────
export function useOffchainSMs(ws) {
    return useQuery({
        queryKey: defKeys.offchainSMs(ws),
        queryFn: async () => { const r = await listOffchainSMs(); return r.offchainSms; },
        enabled: !!ws,
    });
}
export function useOffchainSM(ws, id) {
    return useQuery({
        queryKey: defKeys.offchainSM(ws, id),
        queryFn: () => getOffchainSM(id),
        enabled: !!ws && !!id,
    });
}
export function useOffchainSchema(ws, id) {
    return useQuery({
        queryKey: defKeys.offchainSchema(ws, id),
        queryFn: () => getOffchainSchema(id),
        enabled: !!ws && !!id,
    });
}
// ── Team RBAC Matrix ──────────────────────────────────────────────────────────
/** Returns all matrix entries for a given SuperApp */
export function useRbacMatrixAll(ws, saId) {
    return useQuery({
        queryKey: defKeys.rbac(ws, saId),
        queryFn: async () => { const r = await getRbacMatrix(saId); return r.matrix; },
        enabled: !!ws && !!saId,
    });
}
/** Returns a single matrix entry for a specific SM */
export function useRbacMatrixForSM(ws, saId, smId) {
    return useQuery({
        queryKey: defKeys.rbacSm(ws, saId, smId),
        queryFn: () => getRbacMatrixForSM(saId, smId),
        enabled: !!ws && !!saId && !!smId,
    });
}
/** Legacy: first matrix entry (used by single-SM views) */
export function useRbacMatrix(ws, saId) {
    return useQuery({
        queryKey: defKeys.rbac(ws, saId),
        queryFn: async () => { const r = await getRbacMatrix(saId); return r.matrix[0] ?? null; },
        enabled: !!ws && !!saId,
    });
}
export function useCreateRbacMatrix(ws, saId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createRbacMatrix,
        onSuccess: () => qc.invalidateQueries({ queryKey: defKeys.rbac(ws, saId) }),
    });
}
export function useUpdateRbacMatrix(ws, saId, smId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body) => updateRbacMatrix(saId, smId, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: defKeys.rbac(ws, saId) });
            qc.invalidateQueries({ queryKey: defKeys.rbacSm(ws, saId, smId) });
        },
    });
}
