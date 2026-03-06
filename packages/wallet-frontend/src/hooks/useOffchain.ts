import { useQuery } from '@tanstack/react-query';
import {
  listOffchainDefinitions,
  getOffchainDefinition,
  listOffchainRegistry,
  getOffchainRegistryItem,
  getOffchainConfig,
} from '@/api/offchain.api';
import type { DocumentListParams } from '@/types/documents';

// All calls use X-Workspace, X-SuperApp-ID, X-Portal headers.

export function useOffchainDefinitions() {
  return useQuery({
    queryKey: ['offchain', 'definitions'],
    queryFn: listOffchainDefinitions,
  });
}

export function useOffchainDefinition(offchainSmId: string) {
  return useQuery({
    queryKey: ['offchain', 'definitions', offchainSmId],
    queryFn: () => getOffchainDefinition(offchainSmId),
    enabled: !!offchainSmId,
  });
}

export function useOffchainRegistry(
  collectionName: string,
  params: DocumentListParams = {}
) {
  return useQuery({
    queryKey: ['offchain', 'registry', collectionName, params],
    queryFn: () => listOffchainRegistry(collectionName, params),
    enabled: !!collectionName,
    placeholderData: (prev) => prev,
  });
}

export function useOffchainRegistryItem(collectionName: string, keyValue: string) {
  return useQuery({
    queryKey: ['offchain', 'registry', collectionName, keyValue],
    queryFn: () => getOffchainRegistryItem(collectionName, keyValue),
    enabled: !!collectionName && !!keyValue,
  });
}

export function useOffchainConfig(collectionName: string) {
  return useQuery({
    queryKey: ['offchain', 'config', collectionName],
    queryFn: () => getOffchainConfig(collectionName),
    enabled: !!collectionName,
  });
}
