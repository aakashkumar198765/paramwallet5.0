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
    roles: Record<string, string>; // plain paramId strings, e.g. { "Consignee": "0x..." }
    _sys: {
      plantIDs?: Record<string, string[]>;
      restrictedTo?: Array<{ userId: string; role: string; team: string }>;
    };
  };
  _participants?: Record<string, { C_Organization?: string; C_InternalID?: string }>;
  smId?: string;
  smName?: string;
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
  currentState: string;
  currentSubState: string | null;
  currentMicroState: string | null;
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

export interface DiffBlock {
  hasOrderedItems: boolean;
  parentQty: number | null;
  consumedQty: number | null;
  remainingQty: number | null;
  canCreateChild: boolean;
  items: unknown[];
  children: unknown[];
}

export interface DiffResponse extends SmDocument {
  diff: DiffBlock;
}

export interface DocumentListParams {
  state?: string;
  subState?: string;
  search?: string;
  page?: number;
  limit?: number;
  smId?: string;
  include_actions?: boolean;
  include_diff?: boolean;
}

export interface DocumentListResponse {
  documents: SmDocument[];
  total: number;
  page: number;
  limit: number;
}
