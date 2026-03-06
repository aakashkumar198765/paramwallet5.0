import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSuperAppDefs, getSuperAppDef, createSuperAppDef, updateSuperAppDef,
  listOnchainSMs, getOnchainSM,
  listOnchainSchemas, getOnchainSchema,
  listOffchainSMs, getOffchainSM,
  getOffchainSchema,
} from '@/api/definitions.api';
import type { SuperAppDefinition, SmDefinition, SchemaDefinition } from '@/types/definitions';

// NOTE: The wallet backend has no POST/PUT endpoints for SM or Schema definitions.
// Write operations go to ParamGateway (called separately in the form after these mutations).
// These write hooks are intentional no-ops so form flow can proceed to the deploy step.

// SuperApp Definitions
export function useSuperAppDefs() {
  return useQuery<SuperAppDefinition[]>({
    queryKey: ['definitions', 'superapps'],
    queryFn: listSuperAppDefs,
  });
}

export function useSuperAppDef(id: string) {
  return useQuery<SuperAppDefinition>({
    queryKey: ['definitions', 'superapps', id],
    queryFn: () => getSuperAppDef(id),
    enabled: !!id,
  });
}

export function useCreateSuperAppDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSuperAppDef,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'superapps'] }),
  });
}

export function useUpdateSuperAppDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SuperAppDefinition> }) =>
      updateSuperAppDef(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'superapps'] }),
  });
}

// Onchain SM (read-only — no create/update via wallet backend)
export function useOnchainSMs() {
  return useQuery<SmDefinition[]>({
    queryKey: ['definitions', 'onchain', 'sm'],
    queryFn: listOnchainSMs,
  });
}

export function useOnchainSM(id: string) {
  return useQuery<SmDefinition>({
    queryKey: ['definitions', 'onchain', 'sm', id],
    queryFn: () => getOnchainSM(id),
    enabled: !!id,
  });
}

// Onchain Schema (read-only)
export function useOnchainSchemas() {
  return useQuery<SchemaDefinition[]>({
    queryKey: ['definitions', 'onchain', 'schema'],
    queryFn: listOnchainSchemas,
  });
}

export function useOnchainSchema(id: string) {
  return useQuery<SchemaDefinition>({
    queryKey: ['definitions', 'onchain', 'schema', id],
    queryFn: () => getOnchainSchema(id),
    enabled: !!id,
  });
}

// Offchain SM (read-only)
export function useOffchainSMs() {
  return useQuery<SmDefinition[]>({
    queryKey: ['definitions', 'offchain', 'sm'],
    queryFn: listOffchainSMs,
  });
}

export function useOffchainSM(id: string) {
  return useQuery<SmDefinition>({
    queryKey: ['definitions', 'offchain', 'sm', id],
    queryFn: () => getOffchainSM(id),
    enabled: !!id,
  });
}

// Offchain Schema (read-only, single by id only — no list endpoint)
export function useOffchainSchema(id: string) {
  return useQuery<SchemaDefinition>({
    queryKey: ['definitions', 'offchain', 'schema', id],
    queryFn: () => getOffchainSchema(id),
    enabled: !!id,
  });
}

// No list endpoint for offchain schemas — returns empty array
export function useOffchainSchemas() {
  return useQuery<SchemaDefinition[]>({
    queryKey: ['definitions', 'offchain', 'schema'],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

// ── No-op write hooks for SM/Schema defs ─────────────────────────────────────
// Wallet backend has no POST/PUT for these — actual deploy is via ParamGateway
// (called separately in each form after these mutations succeed).

export function useCreateOnchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_payload: Omit<SmDefinition, '_id'>) => ({} as SmDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'sm'] }),
  });
}

export function useUpdateOnchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; data: Partial<SmDefinition> }) => ({} as SmDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'sm'] }),
  });
}

export function useCreateOnchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_payload: Omit<SchemaDefinition, '_id'>) => ({} as SchemaDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'schema'] }),
  });
}

export function useUpdateOnchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; data: Partial<SchemaDefinition> }) => ({} as SchemaDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'schema'] }),
  });
}

export function useCreateOffchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_payload: Omit<SmDefinition, '_id'>) => ({} as SmDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'sm'] }),
  });
}

export function useUpdateOffchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; data: Partial<SmDefinition> }) => ({} as SmDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'sm'] }),
  });
}

export function useCreateOffchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_payload: Omit<SchemaDefinition, '_id'>) => ({} as SchemaDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'schema'] }),
  });
}

export function useUpdateOffchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_args: { id: string; data: Partial<SchemaDefinition> }) => ({} as SchemaDefinition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'schema'] }),
  });
}
