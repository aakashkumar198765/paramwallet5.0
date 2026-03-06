import { apiClient } from './client';
// ── Workspace ─────────────────────────────────────────────────────────────────
export async function createWorkspace(body) {
    const res = await apiClient.post('/workspace/create', body);
    return res.data;
}
export async function listWorkspaces() {
    const res = await apiClient.get('/workspace/list');
    return res.data;
}
export async function getWorkspace() {
    const res = await apiClient.get('/workspace');
    return res.data;
}
export async function updateWorkspace(body) {
    const res = await apiClient.put('/workspace', body);
    return res.data;
}
// ── Plants ────────────────────────────────────────────────────────────────────
export async function listPlants() {
    const res = await apiClient.get('/workspace/plants');
    return res.data;
}
export async function createPlant(body) {
    const res = await apiClient.post('/workspace/plants', body);
    return res.data;
}
export async function updatePlant(code, body) {
    const res = await apiClient.put(`/workspace/plants/${code}`, body);
    return res.data;
}
export async function deletePlant(code) {
    await apiClient.delete(`/workspace/plants/${code}`);
}
// ── SuperApps ─────────────────────────────────────────────────────────────────
export async function listInstalledSuperApps() {
    const res = await apiClient.get('/superapp');
    return res.data;
}
export async function getInstalledSuperApp(superAppId) {
    const res = await apiClient.get(`/superapp/${superAppId}`);
    return res.data;
}
export async function installSuperApp(superAppId) {
    const res = await apiClient.post('/superapp/install', { superAppId });
    return res.data;
}
export async function updateSuperAppStatus(superAppId, status) {
    const res = await apiClient.put(`/superapp/${superAppId}/status`, { status });
    return res.data;
}
// ── Organizations ─────────────────────────────────────────────────────────────
export async function listOrgs(superAppId) {
    const res = await apiClient.get(`/superapp/${superAppId}/orgs`);
    return res.data;
}
export async function onboardPartner(superAppId, body) {
    const res = await apiClient.post(`/superapp/${superAppId}/partners/onboard`, body);
    return res.data;
}
export async function updateOrgStatus(superAppId, role, paramId, status) {
    const res = await apiClient.put(`/superapp/${superAppId}/orgs/${role}/${paramId}/status`, { status });
    return res.data;
}
// ── Users ─────────────────────────────────────────────────────────────────────
export async function listUsers(superAppId, role) {
    const res = await apiClient.get(`/superapp/${superAppId}/roles/${role}/users`);
    return res.data;
}
export async function addUser(superAppId, role, body) {
    const res = await apiClient.post(`/superapp/${superAppId}/roles/${role}/users`, { users: [body] });
    return res.data;
}
export async function updateUser(superAppId, userId, body) {
    const res = await apiClient.put(`/superapp/${superAppId}/users/${userId}`, body);
    return res.data;
}
export async function suspendUser(superAppId, userId) {
    await apiClient.delete(`/superapp/${superAppId}/users/${userId}`);
}
