import { apiClient } from './client';
import type { AuthResponse } from '@/types/auth';
import type { ProfileResponse } from '@/types/api';

export async function requestOtp(email: string): Promise<{ status: string }> {
  const res = await apiClient.post<{ status: string }>('/auth/otp/request', { email });
  return res.data;
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/otp/verify', { email, otp });
  return res.data;
}

export async function ssoLogin(provider: string, code: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(`/auth/sso/${provider}`, { code });
  return res.data;
}

export async function refreshAuthToken(
  refreshToken: string,
  paramId: string,
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken, paramId });
  return res.data;
}

export async function logout(paramId: string): Promise<void> {
  await apiClient.post('/auth/logout', { paramId });
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await apiClient.get<ProfileResponse>('/profile');
  return res.data;
}

export async function registerDomain(email: string, subdomain: string): Promise<{ paramId: string; pennId: string }> {
  const res = await apiClient.post<{ paramId: string; pennId: string }>('/auth/domain/register', { email, subdomain });
  return res.data;
}
