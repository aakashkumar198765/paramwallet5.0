import apiClient from './client';
import type { AppUser } from '@/types/workspace';

// Uses X-Workspace header for all calls

export async function listUsersByRole(superAppId: string, role: string): Promise<AppUser[]> {
  const res = await apiClient.get<AppUser[]>(`/superapp/${superAppId}/roles/${role}/users`);
  return res.data;
}

export async function createUsers(
  superAppId: string,
  role: string,
  data: {
    users: Array<{
      email: string;
      name: string;
      teams: string[];
      plants: string[];
      partnerId?: string;
    }>;
  }
): Promise<AppUser[]> {
  const res = await apiClient.post<AppUser[]>(
    `/superapp/${superAppId}/roles/${role}/users`,
    data
  );
  return res.data;
}

export async function getUser(superAppId: string, userId: string): Promise<AppUser> {
  const res = await apiClient.get<AppUser>(`/superapp/${superAppId}/users/${userId}`);
  return res.data;
}

export async function updateUser(
  superAppId: string,
  userId: string,
  data: Partial<AppUser>
): Promise<AppUser> {
  const res = await apiClient.put<AppUser>(`/superapp/${superAppId}/users/${userId}`, data);
  return res.data;
}

export async function removeUser(superAppId: string, userId: string): Promise<void> {
  await apiClient.delete(`/superapp/${superAppId}/users/${userId}`);
}
