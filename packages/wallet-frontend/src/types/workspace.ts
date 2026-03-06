export interface Workspace {
  _id: string;
  subdomain: string;
  workspaceName: string;
  ownerParamId: string;
  exchangeParamId: string;
  status: 'active' | 'suspended';
  createdAt: number;
  updatedAt: number;
}

export interface Plant {
  _id: string;
  code: string;
  name: string;
  paramId: string;
  location: Record<string, string>;
  isActive: boolean;
  createdAt: number;
}

export interface InstalledSuperApp {
  _id: string;
  name: string;
  desc: string;
  version: string;
  roles: RoleDefinition[];
  linkedSMs: string[];
  sponsor: string;
  paramId: string;
  status: 'active' | 'suspended';
  installedAt: number;
  installedBy: string;
}

export interface RoleDefinition {
  name: string;
  desc: string;
  teams: { name: string; desc: string }[];
}

export interface Organization {
  _id: string;
  superAppId: string;
  role: string;
  isSponsorOrg: boolean;
  org: {
    paramId: string;
    name: string;
    partnerId?: string;
    taxId?: string;
    legalName?: string;
    telephone?: string;
    address?: Record<string, string>;
  };
  orgAdmin: string | null;
  status: 'active' | 'suspended';
  onboardedAt: number;
  updatedAt: number;
}

export interface AppUser {
  _id: string;
  superAppId: string;
  userId: string;
  email: string;
  orgParamId: string;
  role: string;
  partnerId: string | null;
  plantTeams: { plant: string; teams: string[] }[];
  isOrgAdmin: boolean;
  status: 'active' | 'suspended';
  addedAt: number;
  updatedAt: number;
}
