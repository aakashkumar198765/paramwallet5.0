import { apiClient } from './client';
// ── SuperApp Definitions ──────────────────────────────────────────────────────
export async function listSuperAppDefs() {
    const res = await apiClient.get('/definitions/superapps');
    return res.data;
}
export async function getSuperAppDef(id) {
    const res = await apiClient.get(`/definitions/superapps/${id}`);
    return res.data;
}
export async function createSuperAppDef(body) {
    const res = await apiClient.post('/definitions/superapps', body);
    return res.data;
}
export async function updateSuperAppDef(id, body) {
    const res = await apiClient.put(`/definitions/superapps/${id}`, body);
    return res.data;
}
// ── Onchain SM Definitions ────────────────────────────────────────────────────
// Backend returns { sms: [...] }
export async function listSMs() {
    const res = await apiClient.get('/definitions/sm');
    return res.data;
}
export async function getSM(smId) {
    const res = await apiClient.get(`/definitions/sm/${smId}`);
    return res.data;
}
export async function getSMStates(smId) {
    const res = await apiClient.get(`/definitions/sm/${smId}/states`);
    return res.data;
}
// ── Onchain Schema Definitions ────────────────────────────────────────────────
// Backend returns { schemas: [...] }
export async function listSchemas() {
    const res = await apiClient.get('/definitions/schemas');
    return res.data;
}
export async function getSchema(schemaId) {
    const res = await apiClient.get(`/definitions/schemas/${schemaId}`);
    return res.data;
}
// ── Offchain SM Definitions ───────────────────────────────────────────────────
// Backend returns { offchainSms: [...] }
export async function listOffchainSMs() {
    const res = await apiClient.get('/definitions/offchain-sm');
    return res.data;
}
export async function getOffchainSM(id) {
    const res = await apiClient.get(`/definitions/offchain-sm/${id}`);
    return res.data;
}
// ── Offchain Schema Definitions ───────────────────────────────────────────────
export async function getOffchainSchema(id) {
    const res = await apiClient.get(`/definitions/offchain-schemas/${id}`);
    return res.data;
}
// ── Team RBAC Matrix ──────────────────────────────────────────────────────────
export async function getRbacMatrix(superAppId) {
    const res = await apiClient.get(`/definitions/team-rbac-matrix/${superAppId}`);
    return res.data;
}
export async function getRbacMatrixForSM(superAppId, smId) {
    const res = await apiClient.get(`/definitions/team-rbac-matrix/${superAppId}/${encodeURIComponent(smId)}`);
    return res.data;
}
export async function createRbacMatrix(body) {
    const res = await apiClient.post('/definitions/team-rbac-matrix', body);
    return res.data;
}
export async function updateRbacMatrix(superAppId, smId, body) {
    const res = await apiClient.put(`/definitions/team-rbac-matrix/${superAppId}/${encodeURIComponent(smId)}`, body);
    return res.data;
}
