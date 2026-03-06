import apiClient from './client';
import type { Organization } from '@/types/workspace';

export async function listOrgs(subdomain: string): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>(`/workspaces/${subdomain}/orgs`);
  return res.data;
}

export async function getOrg(subdomain: string, orgId: string): Promise<Organization> {
  const res = await apiClient.get<Organization>(`/workspaces/${subdomain}/orgs/${orgId}`);
  return res.data;
}

export async function createOrg(
  subdomain: string,
  data: Omit<Organization, '_id' | 'createdAt'>
): Promise<Organization> {
  const res = await apiClient.post<Organization>(`/workspaces/${subdomain}/orgs`, data);
  return res.data;
}

export async function updateOrg(
  subdomain: string,
  orgId: string,
  data: Partial<Organization>
): Promise<Organization> {
  const res = await apiClient.put<Organization>(`/workspaces/${subdomain}/orgs/${orgId}`, data);
  return res.data;
}
