import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSuperAppDefs, getSuperAppDef, createSuperAppDef, updateSuperAppDef,
  listOnchainSMs, getOnchainSM, createOnchainSM, updateOnchainSM,
  listOnchainSchemas, getOnchainSchema, createOnchainSchema, updateOnchainSchema,
  listOffchainSMs, getOffchainSM, createOffchainSM, updateOffchainSM,
  listOffchainSchemas, getOffchainSchema, createOffchainSchema, updateOffchainSchema,
} from '@/api/definitions.api';
import type { SuperAppDefinition, SmDefinition, SchemaDefinition } from '@/types/definitions';

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

// Onchain SM
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

export function useCreateOnchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOnchainSM,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'sm'] }),
  });
}

export function useUpdateOnchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SmDefinition> }) =>
      updateOnchainSM(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'sm'] }),
  });
}

// Onchain Schema
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

export function useCreateOnchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOnchainSchema,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'schema'] }),
  });
}

export function useUpdateOnchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchemaDefinition> }) =>
      updateOnchainSchema(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'onchain', 'schema'] }),
  });
}

// Offchain SM
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

export function useCreateOffchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOffchainSM,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'sm'] }),
  });
}

export function useUpdateOffchainSM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SmDefinition> }) =>
      updateOffchainSM(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'sm'] }),
  });
}

// Offchain Schema
export function useOffchainSchemas() {
  return useQuery<SchemaDefinition[]>({
    queryKey: ['definitions', 'offchain', 'schema'],
    queryFn: listOffchainSchemas,
  });
}

export function useOffchainSchema(id: string) {
  return useQuery<SchemaDefinition>({
    queryKey: ['definitions', 'offchain', 'schema', id],
    queryFn: () => getOffchainSchema(id),
    enabled: !!id,
  });
}

export function useCreateOffchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOffchainSchema,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'schema'] }),
  });
}

export function useUpdateOffchainSchema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchemaDefinition> }) =>
      updateOffchainSchema(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['definitions', 'offchain', 'schema'] }),
  });
}
