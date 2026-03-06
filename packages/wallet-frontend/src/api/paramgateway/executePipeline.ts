import pgClient, { encodePipelineId } from './client';
import type { ExecuteResponse, PipelineResult } from './types';

/**
 * POST /api/pipelines/{pipelineId}/execute?dryRun=false
 * pipelineId is URL-encoded (colons → %3A)
 */
export async function executePipeline(
  pipelineId: string,
  payload: unknown[]
): Promise<PipelineResult> {
  const encodedId = encodePipelineId(pipelineId);
  const res = await pgClient.post<ExecuteResponse>(
    `/api/pipelines/${encodedId}/execute?dryRun=false`,
    payload
  );
  return { batchIds: res.data.data.batchIds };
}
