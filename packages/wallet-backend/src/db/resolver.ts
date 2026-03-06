// DB name resolution functions — these are CRITICAL correctness-sensitive functions

export function resolveDefinitionsDb(): string {
  return 'param_definitions';
}

export function resolveDomainDb(): string {
  return 'param_saas';
}

export function resolveAuthDb(): string {
  return 'param_auth';
}

export function resolveWorkspaceDb(workspace: string): string {
  // workspace DB = subdomain name directly
  return workspace;
}

export function resolveSuperAppDbName(workspace: string, superAppId: string): string {
  // Format: {subdomain}_{superAppId[0:8]}
  return `${workspace}_${superAppId.slice(0, 8)}`;
}

export function resolveOrgPartitionDbName(
  workspace: string,
  superAppId: string,
  paramId: string,  // org ethereum address — e.g. "0x6193b497f8e2a1d340b2..."
  portal: string    // role name — e.g. "Consignee", "FF", "CHA"
): string {
  // Format: {subdomain}_{superAppId[0:8]}_{org[2:22]}_{portal}
  // org[2:22] = strip "0x", take first 20 hex chars of paramId
  const orgPart = paramId.startsWith('0x')
    ? paramId.slice(2, 22)
    : paramId.slice(0, 20);
  return `${workspace}_${superAppId.slice(0, 8)}_${orgPart}_${portal}`;
}
