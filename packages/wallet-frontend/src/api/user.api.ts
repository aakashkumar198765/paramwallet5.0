import apiClient from './client';
import type { AppUser } from '@/types/workspace';

export async function listUsers(subdomain: string, superAppId: string): Promise<AppUser[]> {
  const res = await apiClient.get<AppUser[]>(`/workspaces/${subdomain}/superapps/${superAppId}/users`);
  return res.data;
}

export async function getUser(subdomain: string, superAppId: string, userId: string): Promise<AppUser> {
  const res = await apiClient.get<AppUser>(`/workspaces/${subdomain}/superapps/${superAppId}/users/${userId}`);
  return res.data;
}

export async function inviteUser(
  subdomain: string,
  superAppId: string,
  data: { email: string; roleId: string; teamIds: string[] }
): Promise<AppUser> {
  const res = await apiClient.post<AppUser>(
    `/workspaces/${subdomain}/superapps/${superAppId}/users/invite`,
    data
  );
  return res.data;
}

export async function updateUser(
  subdomain: string,
  superAppId: string,
  userId: string,
  data: Partial<AppUser>
): Promise<AppUser> {
  const res = await apiClient.put<AppUser>(
    `/workspaces/${subdomain}/superapps/${superAppId}/users/${userId}`,
    data
  );
  return res.data;
}

export async function removeUser(subdomain: string, superAppId: string, userId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${subdomain}/superapps/${superAppId}/users/${userId}`);
}

export async function getUsersByRole(subdomain: string, superAppId: string, roleId: string): Promise<AppUser[]> {
  const res = await apiClient.get<AppUser[]>(
    `/workspaces/${subdomain}/superapps/${superAppId}/users`,
    { params: { roleId } }
  );
  return res.data;
}
