import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSuperAppDefs,
  getSuperAppDef,
  createSuperAppDef,
  updateSuperAppDef,
  listSMs,
  getSM,
  getSMStates,
  listSchemas,
  getSchema,
  listOffchainSMs,
  getOffchainSM,
  getOffchainSchema,
  getRbacMatrix,
  getRbacMatrixForSM,
  createRbacMatrix,
  updateRbacMatrix,
} from '@/api/definitions.api';

export const defKeys = {
  superAppDefs:    (ws: string)              => ['superAppDefs', ws] as const,
  superAppDef:     (ws: string, id: string)  => ['superAppDef', ws, id] as const,
  sms:             (ws: string)              => ['sms', ws] as const,
  sm:              (ws: string, id: string)  => ['sm', ws, id] as const,
  smStates:        (ws: string, id: string)  => ['smStates', ws, id] as const,
  schemas:         (ws: string)              => ['schemas', ws] as const,
  schema:          (ws: string, id: string)  => ['schema', ws, id] as const,
  offchainSMs:     (ws: string)              => ['offchainSMs', ws] as const,
  offchainSM:      (ws: string, id: string)  => ['offchainSM', ws, id] as const,
  offchainSchema:  (ws: string, id: string)  => ['offchainSchema', ws, id] as const,
  rbac:            (ws: string, saId: string)=> ['rbac', ws, saId] as const,
  rbacSm:          (ws: string, saId: string, smId: string) => ['rbacSm', ws, saId, smId] as const,
};

// ── SuperApp Definitions ──────────────────────────────────────────────────────

export function useSuperAppDefs(ws: string) {
  return useQuery({
    queryKey: defKeys.superAppDefs(ws),
    queryFn: async () => { const r = await listSuperAppDefs(); return r.superapps; },
    enabled: !!ws,
  });
}

export function useSuperAppDef(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.superAppDef(ws, id),
    queryFn: () => getSuperAppDef(id),
    enabled: !!ws && !!id,
  });
}

export function useCreateSuperAppDef(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSuperAppDef,
    onSuccess: () => qc.invalidateQueries({ queryKey: defKeys.superAppDefs(ws) }),
  });
}

export function useUpdateSuperAppDef(ws: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof updateSuperAppDef>[1]) => updateSuperAppDef(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: defKeys.superAppDefs(ws) });
      qc.invalidateQueries({ queryKey: defKeys.superAppDef(ws, id) });
    },
  });
}

// ── SM Definitions — backend returns { sms: [] } ─────────────────────────────

export function useSMs(ws: string) {
  return useQuery({
    queryKey: defKeys.sms(ws),
    queryFn: async () => { const r = await listSMs(); return r.sms; },
    enabled: !!ws,
  });
}

export function useSM(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.sm(ws, id),
    queryFn: () => getSM(id),
    enabled: !!ws && !!id,
  });
}

export function useSMStates(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.smStates(ws, id),
    queryFn: () => getSMStates(id),
    enabled: !!ws && !!id,
  });
}

// ── Schema Definitions — backend returns { schemas: [] } ─────────────────────

export function useSchemas(ws: string) {
  return useQuery({
    queryKey: defKeys.schemas(ws),
    queryFn: async () => { const r = await listSchemas(); return r.schemas; },
    enabled: !!ws,
  });
}

export function useSchema(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.schema(ws, id),
    queryFn: () => getSchema(id),
    enabled: !!ws && !!id,
  });
}

// ── Offchain SM Definitions — backend returns { offchainSms: [] } ────────────

export function useOffchainSMs(ws: string) {
  return useQuery({
    queryKey: defKeys.offchainSMs(ws),
    queryFn: async () => { const r = await listOffchainSMs(); return r.offchainSms; },
    enabled: !!ws,
  });
}

export function useOffchainSM(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.offchainSM(ws, id),
    queryFn: () => getOffchainSM(id),
    enabled: !!ws && !!id,
  });
}

export function useOffchainSchema(ws: string, id: string) {
  return useQuery({
    queryKey: defKeys.offchainSchema(ws, id),
    queryFn: () => getOffchainSchema(id),
    enabled: !!ws && !!id,
  });
}

// ── Team RBAC Matrix ──────────────────────────────────────────────────────────

/** Returns all matrix entries for a given SuperApp */
export function useRbacMatrixAll(ws: string, saId: string) {
  return useQuery({
    queryKey: defKeys.rbac(ws, saId),
    queryFn: async () => { const r = await getRbacMatrix(saId); return r.matrix; },
    enabled: !!ws && !!saId,
  });
}

/** Returns a single matrix entry for a specific SM */
export function useRbacMatrixForSM(ws: string, saId: string, smId: string) {
  return useQuery({
    queryKey: defKeys.rbacSm(ws, saId, smId),
    queryFn: () => getRbacMatrixForSM(saId, smId),
    enabled: !!ws && !!saId && !!smId,
  });
}

/** Legacy: first matrix entry (used by single-SM views) */
export function useRbacMatrix(ws: string, saId: string) {
  return useQuery({
    queryKey: defKeys.rbac(ws, saId),
    queryFn: async () => { const r = await getRbacMatrix(saId); return r.matrix[0] ?? null; },
    enabled: !!ws && !!saId,
  });
}

export function useCreateRbacMatrix(ws: string, saId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRbacMatrix,
    onSuccess: () => qc.invalidateQueries({ queryKey: defKeys.rbac(ws, saId) }),
  });
}

export function useUpdateRbacMatrix(ws: string, saId: string, smId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof updateRbacMatrix>[2]) => updateRbacMatrix(saId, smId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: defKeys.rbac(ws, saId) });
      qc.invalidateQueries({ queryKey: defKeys.rbacSm(ws, saId, smId) });
    },
  });
}
