import pgClient from './client';
import type { BatchTask, BatchTasksResponse } from './types';

/**
 * GET /api/batches/{batchId}/tasks
 */
export async function getBatchTasks(batchId: string): Promise<{ items: BatchTask[] }> {
  const res = await pgClient.get<BatchTasksResponse>(`/api/batches/${batchId}/tasks`);
  return { items: res.data.items };
}
