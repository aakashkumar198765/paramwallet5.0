export interface SuperAppDefinition {
  _id: string;
  name: string;
  desc: string;
  version: string;
  roles: { name: string; desc: string; teams: { name: string; desc: string }[] }[];
  linkedSMs: string[];
  sponsor: string;
  isActive: number;
  createdAt: number;
  modifiedAt: number;
  createdBy: string;
}

export interface OnchainSMDefinition {
  _id: string;
  name: string;
  smType: string;
  startAt: string;
  states: Record<string, SMStateDefinition>;
  createdAt: number;
  modifiedAt: number;
}

export interface SMStateDefinition {
  schema?: string;
  owner?: string[];
  nextState?: string | null;
  alternateNext?: string[];
  linkedSMs?: string[];
  subStates?: Record<string, SMSubStateDefinition>;
}

export interface SMSubStateDefinition {
  owner?: string[];
  nextState?: string | null;
  start?: boolean;
  microStates?: Record<string, { owner?: string[]; nextState?: string | null; start?: boolean }>;
}

export interface OnchainSchemaDefinition {
  _id: string;
  name: string;
  version: string;
  properties: Record<string, SchemaProperty>;
  createdAt: number;
  modifiedAt: number;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  label?: string;
  order?: number;
  hidden?: boolean;
  enum?: string[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: boolean;
}

export interface OffchainSMDefinition {
  _id: string;
  name: string;
  states: Record<string, { collection: string; keyField?: string }>;
  createdAt: number;
  modifiedAt: number;
}

export interface OffchainSchemaDefinition {
  _id: string;
  name: string;
  version: string;
  properties: Record<string, SchemaProperty>;
  createdAt: number;
  modifiedAt: number;
}

export interface TeamRbacMatrix {
  _id: string;
  superAppId: string;
  smId: string;
  smName?: string;
  version?: string;
  permissions: TeamRbacEntry[];
  createdAt: number;
}

export interface TeamRbacEntry {
  state: string;
  subState: string | null;
  microState: string | null;
  access: Record<string, 'RW' | 'RO' | 'N/A'>;
}
