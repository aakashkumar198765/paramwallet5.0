import { apiClient } from './client';
export async function requestOtp(email) {
    const res = await apiClient.post('/auth/otp/request', { email });
    return res.data;
}
export async function verifyOtp(email, otp) {
    const res = await apiClient.post('/auth/otp/verify', { email, otp });
    return res.data;
}
export async function ssoLogin(provider, code) {
    const res = await apiClient.post(`/auth/sso/${provider}`, { code });
    return res.data;
}
export async function refreshAuthToken(refreshToken, paramId) {
    const res = await apiClient.post('/auth/refresh', { refreshToken, paramId });
    return res.data;
}
export async function logout(paramId) {
    await apiClient.post('/auth/logout', { paramId });
}
export async function getProfile() {
    const res = await apiClient.get('/profile');
    return res.data;
}
export async function registerDomain(email, subdomain) {
    const res = await apiClient.post('/auth/domain/register', { email, subdomain });
    return res.data;
}
