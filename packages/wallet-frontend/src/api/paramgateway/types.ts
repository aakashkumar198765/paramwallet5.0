export interface DeployOnchainSMPayload {
  smId: string;
  name: string;
  smType: string;
  states: Record<string, unknown>;
}

export interface DeployOnchainSchemaPayload {
  schemaId: string;
  name: string;
  version: string;
  properties: Record<string, unknown>;
}

export interface DeployOffchainSMPayload {
  smId: string;
  name: string;
  states: Record<string, unknown>;
}

export interface DeployOffchainSchemaPayload {
  schemaId: string;
  name: string;
  version: string;
  properties: Record<string, unknown>;
}

export interface CreateDocPayload {
  smId: string;
  roles: Record<string, string[]>;
  stateTo: string;
  subStateTo?: string | null;
  data: Record<string, unknown>;
}

export interface TransitionPayload {
  docId: string;
  stateTo: string;
  subStateTo?: string | null;
  microStateTo?: string | null;
  data?: Record<string, unknown>;
}

export interface ParamGatewaySuccess {
  success: true;
}
