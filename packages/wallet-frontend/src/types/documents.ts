export interface SmDocument {
  _id: string;
  _local: {
    state: string;
    subState: string | null;
    microState: string | null;
    phase: string;
    timestamp: number;
  };
  _chain: {
    roles: Record<string, { paramId: string; name: string }>;
    _sys: {
      plantIDs?: Record<string, string[]>;
      restrictedTo?: Array<{ userId: string; role: string; team: string }>;
    };
  };
  _participants?: Record<string, { C_Organization?: string; C_InternalID?: string }>;
  access?: 'RW' | 'RO';
  [key: string]: unknown;
}

export interface DocumentAction {
  label: string;
  pipelineId: string;
  targetState: string;
  targetSubState: string | null;
  targetMicroState: string | null;
  canCreate: boolean;
  diffReason?: string;
}

export interface ActionsResponse {
  availableActions: DocumentAction[];
  alternateNextActions: DocumentAction[];
  linkedSmActions: DocumentAction[];
}

export interface TxnHistory {
  _id: string;
  docId: string;
  sequence: number;
  stateTo: string;
  timestamp: number;
  actorId: string;
  changeType: string;
}

export interface DiffResponse {
  orderedItems: unknown[];
  diff: Record<string, { parent: number; children: number; balance: number }>;
}

export interface DocumentListParams {
  state?: string;
  subState?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DocumentListResponse {
  items: SmDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
