export interface SuperAppDefinition {
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
  isActive: number;
}

export interface SmDefinition {
  _id: string;
  defId?: string;
  name: string;
  displayName: string;
  smType: string;
  roles: string[];
  startAt: string;
  states: Record<string, SmState>;
}

export interface SmState {
  desc?: string;
  phase?: string;
  schema?: string;
  end?: boolean;
  owner: string[];
  visibility?: string[];
  nextState?: string | null;
  alternateNext?: string[];
  linkedSMs?: string[];
  subStates?: Record<string, SmSubState>;
}

export interface SmSubState {
  start?: boolean;
  end?: boolean;
  owner: string[];
  nextState?: string | null;
  microStates?: Record<string, SmMicroState>;
}

export interface SmMicroState {
  start?: boolean;
  end?: boolean;
  desc?: string;
  owner: string[];
  nextState?: string | null;
}

export interface SchemaDefinition {
  _id: string;
  displayName: string;
  desc: string;
  version: string;
  properties: Record<string, SchemaGroup>;
}

export interface SchemaGroup {
  type: 'contact' | 'object' | 'array';
  desc?: string;
  order?: number;
  properties?: Record<string, SchemaField>;
  items?: {
    type: string;
    properties: Record<string, SchemaField>;
  };
}

export interface SchemaField {
  type: string;
  required?: boolean;
  hidden?: boolean;
  order?: number;
  desc?: string;
  title?: string;
  enum?: string[];
}

export interface TeamRbacMatrix {
  _id: string;
  superAppId: string;
  smId: string;
  smName?: string;
  permissions: Array<{
    state: string;
    subState: string | null;
    microState: string | null;
    access: Record<string, 'RW' | 'RO' | 'N/A'>;
  }>;
}
