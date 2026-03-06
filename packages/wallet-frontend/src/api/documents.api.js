import { apiClient } from './client';
export async function getDocuments(params) {
    const res = await apiClient.get('/documents', { params });
    return res.data;
}
export async function getDocument(docId, smId) {
    const res = await apiClient.get(`/documents/${docId}`, { params: smId ? { smId } : {} });
    return res.data;
}
export async function getDocumentActions(docId, smId) {
    const res = await apiClient.get(`/documents/${docId}/actions`, { params: smId ? { smId } : {} });
    return res.data;
}
export async function getDocumentDiff(docId) {
    const res = await apiClient.get(`/documents/${docId}/diff`);
    return res.data;
}
export async function getDocumentChain(docId) {
    const res = await apiClient.get(`/documents/${docId}/chain`);
    return res.data;
}
