import apiClient from './client';
import type { Organization } from '@/types/workspace';

// Uses X-Workspace and X-SuperApp-ID headers for all calls

export async function getOrgProfile(superAppId: string): Promise<Organization> {
  const res = await apiClient.get<Organization>(`/superapp/${superAppId}/org/profile`);
  return res.data;
}

export async function listOrgs(superAppId: string): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>(`/superapp/${superAppId}/orgs`);
  return res.data;
}

export async function listOrgsByRole(superAppId: string, role: string): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>(`/superapp/${superAppId}/orgs/${role}`);
  return res.data;
}

export async function onboardPartner(
  superAppId: string,
  data: { partnerParamId: string; role: string; orgName: string; vendorId?: string }
): Promise<Organization> {
  const res = await apiClient.post<Organization>(
    `/superapp/${superAppId}/partners/onboard`,
    data
  );
  return res.data;
}

export async function updateOrgStatus(
  superAppId: string,
  role: string,
  paramId: string,
  status: string
): Promise<Organization> {
  const res = await apiClient.put<Organization>(
    `/superapp/${superAppId}/orgs/${role}/${paramId}/status`,
    { status }
  );
  return res.data;
}
