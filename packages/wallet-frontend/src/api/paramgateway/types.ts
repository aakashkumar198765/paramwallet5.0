export interface BatchTask {
  _id: string;
  batchId: string;
  status: 'running' | 'synced' | 'failed';
  txnId?: string;
}

export interface ExecuteResponse {
  success: boolean;
  data: {
    batchIds: string[];
  };
}

export interface BatchTasksResponse {
  items: BatchTask[];
}

export interface PipelineResult {
  batchIds: string[];
}

export interface DeployResult {
  txnId: string;
}
