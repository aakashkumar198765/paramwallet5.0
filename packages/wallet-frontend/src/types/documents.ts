export interface SmDocument {
  _id: string;
  _local: {
    state: string;
    subState?: string | null;
    microState?: string | null;
    phase?: string | null;
    timestamp: number;
    smId?: string;
  };
  _chain: {
    roles: Record<string, string[]>;
    refs?: { docIds?: string[] };
    _sys?: {
      plantIDs?: Record<string, string[]>;
      restrictedTo?: Record<string, string[]>;
    };
  };
  _access?: 'RW' | 'RO';
  _actions?: ActionResult;
  _diff?: DiffResult;
  [key: string]: unknown;
}

export interface ActionResult {
  availableActions: Action[];
  alternateNextActions: Action[];
  linkedSmActions: Action[];
}

export interface Action {
  type: 'state' | 'subState' | 'microState' | 'linkedSM';
  label: string;
  targetState: string;
  targetSubState: string | null;
  targetMicroState: string | null;
  smId?: string;
}

export interface DiffItem {
  sku: string;
  orderedQty: number;
  fulfilledQty: number;
  remainingQty: number;
}

export interface DiffResult {
  parentDocId: string;
  childDocIds: string[];
  orderedItems: DiffItem[];
  isFullyFulfilled: boolean;
}

export interface TxnHistoryEntry {
  _id: string;
  docId: string;
  sequence: number;
  stateTo: string;
  subStateTo?: string | null;
  microStateTo?: string | null;
  actor: string;
  changeType: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface DocumentListResponse {
  total: number;
  page: number;
  limit: number;
  documents: SmDocument[];
  nextCursor?: { timestamp: number; id: string } | null;
}

export interface DocumentListParams {
  superAppId?: string;
  smId?: string;
  state?: string;
  subState?: string;
  phase?: string;
  page?: number;
  limit?: number;
  search?: string;
  partner_id?: string;
  include_actions?: boolean;
  include_diff?: boolean;
  cursor_timestamp?: number;
  cursor_id?: string;
  [key: string]: unknown;
}
