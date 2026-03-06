/**
 * Database name resolver functions.
 * ALL DB name strings must originate here — no hardcoded DB names in handlers.
 *
 * DB topology:
 *   param_definitions                                      — global singleton
 *   param_saas                                             — global singleton
 *   param_auth                                             — global singleton
 *   {subdomain}                                            — per workspace
 *   {subdomain}_{superAppId[0:8]}                          — per installed superapp per workspace
 *   {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}    — per participating org per superapp
 */

/**
 * Resolves the Org Partition DB name.
 *
 * Format: {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}
 * Example: bosch-exim_86bbaa78_6193b497f8e2a1d340b2_Consignee
 *
 * @param workspace  - Workspace subdomain (e.g. "bosch-exim")
 * @param superAppId - Full superAppId (20-char hex); first 8 chars used
 * @param paramId    - Org paramId (ethereum hex address starting with "0x"); strip "0x", take [2:22]
 * @param portal     - Role name this partition belongs to (e.g. "Consignee")
 */
export function resolveOrgPartitionDbName(
  workspace: string,
  superAppId: string,
  paramId: string,
  portal: string,
): string {
  const superAppPrefix = superAppId.slice(0, 8);
  // Strip "0x" prefix if present, then take first 20 chars
  const orgSlice = paramId.startsWith('0x') ? paramId.slice(2, 22) : paramId.slice(0, 20);
  return `${workspace}_${superAppPrefix}_${orgSlice}_${portal}`;
}

/**
 * Resolves the SuperApp DB name.
 *
 * Format: {subdomain}_{superAppId[0:8]}
 * Example: bosch-exim_86bbaa78
 *
 * @param workspace  - Workspace subdomain
 * @param superAppId - Full superAppId; first 8 chars used
 */
export function resolveSuperAppDbName(workspace: string, superAppId: string): string {
  return `${workspace}_${superAppId.slice(0, 8)}`;
}

/**
 * Resolves the Workspace DB name.
 *
 * Format: {subdomain}  (no prefix — named after subdomain directly)
 * Example: bosch-exim
 *
 * @param workspace - Workspace subdomain
 */
export function resolveWorkspaceDb(workspace: string): string {
  return workspace;
}

/**
 * Resolves the Definitions DB name.
 * Always returns the global singleton name.
 */
export function resolveDefinitionsDb(): string {
  return 'param_definitions';
}

/**
 * Resolves the SaaS domain DB name.
 * Always returns the global singleton name.
 */
export function resolveSaasDb(): string {
  return 'param_saas';
}

/**
 * Resolves the Auth DB name.
 * Always returns the global singleton name.
 */
export function resolveAuthDb(): string {
  return 'param_auth';
}
