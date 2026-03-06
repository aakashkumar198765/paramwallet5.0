import { FastifyInstance } from 'fastify';
import {
  listSuperAppDefinitions,
  getSuperAppDefinition,
  createSuperAppDefinition,
  updateSuperAppDefinition,
  listSmDefinitions,
  getSmDefinition,
  getSmStates,
  listSchemaDefinitions,
  getSchemaDefinition,
  listOffchainSmDefinitions,
  getOffchainSmDefinition,
  getOffchainSchemaDefinition,
  listDefinitionTeamRbacMatrix,
  getDefinitionTeamRbacMatrix,
  createDefinitionTeamRbacMatrix,
  updateDefinitionTeamRbacMatrix,
} from './definitions.handler.js';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  listPlants,
  createPlant,
  updatePlant,
  deletePlant,
} from './workspace.handler.js';
import {
  getProfile,
  getUserProfile,
  updateUserProfile,
} from './profile.handler.js';
import {
  installSuperApp,
  listInstalledSuperApps,
  getInstalledSuperApp,
  updateSuperAppStatus,
  manifestSuperApp,
} from './superapp.handler.js';
import {
  getOrgProfile,
  listOrgs,
  listOrgsByRole,
  handlePartnerOnboardRest as onboardPartner,
  updateOrgStatus,
} from './partner.handler.js';
import {
  listUsersByRole,
  createUsers,
  getUser,
  updateUser,
  deleteUser,
} from './user.handler.js';
import {
  listTeamRbacMatrix,
  getTeamRbacMatrix,
  updateTeamRbacMatrix,
} from './team-rbac.handler.js';

export async function platformRouter(fastify: FastifyInstance): Promise<void> {
  // ── Profile (no platform context required) ──────────────────────────────────
  fastify.get('/profile', getProfile);
  fastify.get('/user/profile', getUserProfile);
  fastify.put('/user/profile', updateUserProfile);

  // ── Definitions ─────────────────────────────────────────────────────────────
  fastify.get('/definitions/superapps', listSuperAppDefinitions);
  fastify.get('/definitions/superapps/:id', getSuperAppDefinition);
  fastify.post('/definitions/superapps', createSuperAppDefinition);
  fastify.put('/definitions/superapps/:id', updateSuperAppDefinition);

  fastify.get('/definitions/sm', listSmDefinitions);
  fastify.get('/definitions/sm/:smId', getSmDefinition);
  fastify.get('/definitions/sm/:smId/states', getSmStates);

  fastify.get('/definitions/schemas', listSchemaDefinitions);
  fastify.get('/definitions/schemas/:schemaId', getSchemaDefinition);

  fastify.get('/definitions/offchain-sm', listOffchainSmDefinitions);
  fastify.get('/definitions/offchain-sm/:id', getOffchainSmDefinition);
  fastify.get('/definitions/offchain-schemas/:id', getOffchainSchemaDefinition);

  fastify.get(
    '/definitions/team-rbac-matrix/:superAppId',
    listDefinitionTeamRbacMatrix
  );
  fastify.get(
    '/definitions/team-rbac-matrix/:superAppId/:smId',
    getDefinitionTeamRbacMatrix
  );
  fastify.post('/definitions/team-rbac-matrix', createDefinitionTeamRbacMatrix);
  fastify.put(
    '/definitions/team-rbac-matrix/:superAppId/:smId',
    updateDefinitionTeamRbacMatrix
  );

  // ── Workspace ────────────────────────────────────────────────────────────────
  fastify.post('/workspace/create', createWorkspace);
  fastify.get('/workspace/list', listWorkspaces);
  fastify.get('/workspace', getWorkspace);
  fastify.put('/workspace', updateWorkspace);

  // Plants
  fastify.get('/workspace/plants', listPlants);
  fastify.post('/workspace/plants', createPlant);
  fastify.put('/workspace/plants/:code', updatePlant);
  fastify.delete('/workspace/plants/:code', deletePlant);

  // ── SuperApp ─────────────────────────────────────────────────────────────────
  fastify.post('/superapp/install', installSuperApp);
  fastify.get('/superapp', listInstalledSuperApps);
  fastify.get('/superapp/:superAppId', getInstalledSuperApp);
  fastify.put('/superapp/:superAppId/status', updateSuperAppStatus);
  fastify.post('/superapp/:superAppId/manifest', manifestSuperApp);

  // ── Organisations ────────────────────────────────────────────────────────────
  fastify.get('/superapp/:superAppId/org/profile', getOrgProfile);
  fastify.get('/superapp/:superAppId/orgs', listOrgs);
  fastify.get('/superapp/:superAppId/orgs/:role', listOrgsByRole);
  fastify.post('/superapp/:superAppId/partners/onboard', onboardPartner);
  fastify.put('/superapp/:superAppId/orgs/:role/:paramId/status', updateOrgStatus);

  // ── Users ─────────────────────────────────────────────────────────────────────
  fastify.get('/superapp/:superAppId/roles/:role/users', listUsersByRole);
  fastify.post('/superapp/:superAppId/roles/:role/users', createUsers);
  fastify.get('/superapp/:superAppId/users/:userId', getUser);
  fastify.put('/superapp/:superAppId/users/:userId', updateUser);
  fastify.delete('/superapp/:superAppId/users/:userId', deleteUser);

  // ── Team RBAC Matrix (SuperApp level) ─────────────────────────────────────────
  fastify.get('/superapp/:superAppId/team-rbac-matrix', listTeamRbacMatrix);
  fastify.get('/superapp/:superAppId/team-rbac-matrix/:smId', getTeamRbacMatrix);
  fastify.put('/superapp/:superAppId/team-rbac-matrix/:smId', updateTeamRbacMatrix);
}
