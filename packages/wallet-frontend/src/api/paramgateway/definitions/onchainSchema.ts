import { executePipeline } from '../executePipeline';
import { getBatchTasks } from '../getBatchTasks';
import type { DeployResult } from '../types';

const PIPELINE_ID = 'pipe:sys:define-onchain-schema-v1';
const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS = 60_000;

/**
 * Deploy an onchain schema definition via ParamGateway.
 * Executes the pipeline then polls until all tasks are synced.
 */
export async function deployOnchainSchema(payload: unknown): Promise<DeployResult> {
  const { batchIds } = await executePipeline(PIPELINE_ID, [payload]);

  const deadline = Date.now() + TIMEOUT_MS;

  for (const batchId of batchIds) {
    while (Date.now() < deadline) {
      const { items } = await getBatchTasks(batchId);

      const allSynced = items.length > 0 && items.every((t) => t.status === 'synced');
      const anyFailed = items.some((t) => t.status === 'failed');

      if (anyFailed) {
        throw new Error(`Batch ${batchId} has failed tasks`);
      }

      if (allSynced) {
        const txnId = items[0]?.txnId ?? batchId;
        return { txnId };
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(`Timeout waiting for batch ${batchId} to sync`);
  }

  throw new Error('No batch IDs returned from pipeline execution');
}
