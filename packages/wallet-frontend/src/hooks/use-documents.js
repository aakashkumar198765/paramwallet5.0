import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getDocuments, getDocument, getDocumentActions, getDocumentDiff, getDocumentChain, } from '@/api/documents.api';
export const docKeys = {
    list: (ws, saId, params) => ['documents', ws, saId, params],
    detail: (ws, saId, docId) => ['document', ws, saId, docId],
    actions: (ws, saId, docId) => ['documentActions', ws, saId, docId],
    diff: (ws, saId, docId) => ['documentDiff', ws, saId, docId],
    chain: (ws, saId, docId) => ['documentChain', ws, saId, docId],
};
export function useDocuments(ws, saId, params) {
    return useQuery({
        queryKey: docKeys.list(ws, saId, params),
        queryFn: () => getDocuments(params),
        enabled: !!ws && !!saId,
        placeholderData: keepPreviousData,
    });
}
export function useDocument(ws, saId, docId, smId) {
    return useQuery({
        queryKey: docKeys.detail(ws, saId, docId),
        queryFn: () => getDocument(docId, smId),
        enabled: !!docId,
    });
}
export function useDocumentActions(ws, saId, docId) {
    return useQuery({
        queryKey: docKeys.actions(ws, saId, docId),
        queryFn: () => getDocumentActions(docId),
        enabled: !!docId,
    });
}
export function useDocumentDiff(ws, saId, docId) {
    return useQuery({
        queryKey: docKeys.diff(ws, saId, docId),
        queryFn: () => getDocumentDiff(docId),
        enabled: !!docId,
    });
}
export function useDocumentChain(ws, saId, docId) {
    return useQuery({
        queryKey: docKeys.chain(ws, saId, docId),
        queryFn: () => getDocumentChain(docId),
        enabled: !!docId,
    });
}
