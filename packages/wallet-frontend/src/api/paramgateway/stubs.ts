/**
 * ParamGateway stubs — all operations return { success: true }.
 * When ParamGateway API documentation is provided, only the function
 * bodies below need to change. No UI changes required.
 */
import type {
  DeployOnchainSMPayload,
  DeployOnchainSchemaPayload,
  DeployOffchainSMPayload,
  DeployOffchainSchemaPayload,
  CreateDocPayload,
  TransitionPayload,
  ParamGatewaySuccess,
} from './types';

export async function deployOnchainSM(_payload: DeployOnchainSMPayload): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines with mnemonic:"define", defType:"statemachine"
  console.warn('ParamGateway stub called: deployOnchainSM');
  return { success: true };
}

export async function deployOnchainSchema(_payload: DeployOnchainSchemaPayload): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines with mnemonic:"define", defType:"schema"
  console.warn('ParamGateway stub called: deployOnchainSchema');
  return { success: true };
}

export async function deployOffchainSM(_payload: DeployOffchainSMPayload): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines with mnemonic:"define", defType:"offchain-statemachine"
  console.warn('ParamGateway stub called: deployOffchainSM');
  return { success: true };
}

export async function deployOffchainSchema(_payload: DeployOffchainSchemaPayload): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines with mnemonic:"define", defType:"offchain-schema"
  console.warn('ParamGateway stub called: deployOffchainSchema');
  return { success: true };
}

export async function createDocument(
  _pipelineId: string,
  _payload: CreateDocPayload,
): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines/:id/execute
  console.warn('ParamGateway stub called: createDocument');
  return { success: true };
}

export async function transitionDocument(
  _pipelineId: string,
  _payload: TransitionPayload,
): Promise<ParamGatewaySuccess> {
  // TODO: POST /pipelines/:id/execute with _chain.stateTo
  console.warn('ParamGateway stub called: transitionDocument');
  return { success: true };
}
