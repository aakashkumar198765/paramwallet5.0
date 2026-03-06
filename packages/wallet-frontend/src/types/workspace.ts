export interface Workspace {
  _id: string;
  subdomain: string;
  workspaceName: string;
  ownerParamId: string;
  ownerOrgName: string;
  status: string;
  createdAt: number;
}

export interface Plant {
  _id: string;
  code: string;
  name: string;
  paramId: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  isActive: boolean;
  createdAt: number;
}

export interface InstalledSuperApp {
  _id: string;
  name: string;
  desc: string;
  version: string;
  roles: Array<{
    name: string;
    desc: string;
    teams: Array<{ name: string; desc: string }>;
  }>;
  linkedSMs: string[];
  sponsor: string;
  paramId: string;
  status: string;
  installedAt: number;
  installedBy: string;
}

export interface Organization {
  _id: string;
  orgName: string;
  orgType: string;
  paramId: string;
  isActive: boolean;
  createdAt: number;
}

export interface AppUser {
  _id: string;
  userId: string;
  paramId?: string;
  email: string;
  name: string;
  role: string; // portal name e.g. "Consignee", "Shipper"
  teams: string[];
  plants: string[];
  status: string;
  addedAt: number;
}

export interface PlatformContext {
  paramId: string;
  userId: string;
  email: string;
  role: string;
  teams: string[];
  subdomain: string;
  superAppId?: string;
  portal?: string;
}
