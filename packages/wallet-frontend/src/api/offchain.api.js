import { apiClient } from './client';
export async function listOffchainDefinitions() {
    const res = await apiClient.get('/offchain/definitions');
    return res.data;
}
export async function getOffchainDefinition(id) {
    const res = await apiClient.get(`/offchain/definitions/${id}`);
    return res.data;
}
export async function getRegistryCollection(collectionName) {
    const res = await apiClient.get(`/offchain/registry/${collectionName}`);
    return res.data;
}
export async function getRegistryRecord(collectionName, keyValue) {
    const res = await apiClient.get(`/offchain/registry/${collectionName}/${keyValue}`);
    return res.data;
}
export async function getConfigCollection(collectionName) {
    const res = await apiClient.get(`/offchain/config/${collectionName}`);
    return res.data;
}
