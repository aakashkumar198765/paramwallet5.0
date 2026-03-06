import apiClient from './client';
import type { OtpRequestResponse, OtpVerifyResponse, RefreshResponse } from '@/types/auth';
import type { Profile } from '@/types/auth';

export async function requestOtp(email: string): Promise<OtpRequestResponse> {
  const res = await apiClient.post<OtpRequestResponse>('/auth/otp/request', { email });
  return res.data;
}

export async function verifyOtp(email: string, otp: string): Promise<OtpVerifyResponse> {
  const res = await apiClient.post<OtpVerifyResponse>('/auth/otp/verify', { email, otp });
  return res.data;
}

export async function refreshToken(token: string): Promise<RefreshResponse> {
  const res = await apiClient.post<RefreshResponse>('/auth/refresh', { refreshToken: token });
  return res.data;
}

export async function getProfile(): Promise<Profile> {
  const res = await apiClient.get<Profile>('/profile');
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
