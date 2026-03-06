import { z } from 'zod';

// ── Workspace ────────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
  workspaceName: z.string().min(1),
  exchangeParamId: z.string().min(1),
});

export const UpdateWorkspaceSchema = z.object({
  workspaceName: z.string().min(1),
});

// ── Plant ─────────────────────────────────────────────────────────────────────

export const CreatePlantSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  paramId: z.string().optional(),
  location: z.string().optional(),
});

export const UpdatePlantSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
});

// ── SuperApp Definition ───────────────────────────────────────────────────────
// Spec §6.1: name, desc, version, roles[], linkedSMs[], sponsor

const TeamSchema = z.object({
  name: z.string(),
  desc: z.string().optional(),
});

const RoleSchema = z.object({
  name: z.string(),
  desc: z.string().optional(),
  teams: z.array(TeamSchema),
});

export const CreateSuperAppDefinitionSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional(),
  version: z.string().default('1.0.0'),
  roles: z.array(RoleSchema).default([]),
  linkedSMs: z.array(z.string()).default([]),
  sponsor: z.string().min(1),             // which role is the sponsor
  isActive: z.number().int().default(1),
});

export const UpdateSuperAppDefinitionSchema = CreateSuperAppDefinitionSchema.partial();

// ── SuperApp Install ─────────────────────────────────────────────────────────
// sponsorRole is read from superapp_definitions.sponsor — not supplied by caller

export const InstallSuperAppSchema = z.object({
  superAppId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

// ── Organisation ─────────────────────────────────────────────────────────────

export const OnboardPartnerSchema = z.object({
  role: z.string().min(1),
  org: z.object({
    paramId: z.string().min(1),
    name: z.string().min(1),
    partnerId: z.string().min(1),
    taxId: z.string().optional(),
    legalName: z.string().optional(),
    telephone: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }),
  orgAdmin: z.string().email(),
  plants: z.array(z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    location: z.string().optional(),
  })).default([]),
});

export const UpdateOrgStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
});

// ── User ─────────────────────────────────────────────────────────────────────

export const CreateUsersSchema = z.object({
  users: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      plantTeams: z.array(
        z.object({
          plant: z.string(),
          teams: z.array(z.string()),
        })
      ).default([]),
      isOrgAdmin: z.boolean().default(false),
    })
  ),
});

export const UpdateUserSchema = z.object({
  plantTeams: z.array(
    z.object({
      plant: z.string(),
      teams: z.array(z.string()),
    })
  ).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  isOrgAdmin: z.boolean().optional(),
});

// ── Team RBAC Matrix ─────────────────────────────────────────────────────────
// Spec §6.4: permissions is an array of { state, subState, microState, access: { "Role.Team": "RW"|"RO"|"N/A" } }

export const RbacPermissionEntrySchema = z.object({
  state: z.string(),
  subState: z.string().nullable().default(null),
  microState: z.string().nullable().default(null),
  // access keys are "Role.Team" strings; values are RW / RO / N/A
  access: z.record(z.string(), z.enum(['RW', 'RO', 'N/A'])),
});

export const CreateTeamRbacMatrixSchema = z.object({
  superAppId: z.string().min(1),
  smId: z.string().min(1),
  smName: z.string().optional(),
  permissions: z.array(RbacPermissionEntrySchema),
  version: z.string().default('1.0.0'),
});

export const UpdateTeamRbacMatrixSchema = z.object({
  permissions: z.array(RbacPermissionEntrySchema),
});

// ── Profile ───────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(1),
});

// Type exports
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type CreatePlantInput = z.infer<typeof CreatePlantSchema>;
export type UpdatePlantInput = z.infer<typeof UpdatePlantSchema>;
export type CreateSuperAppDefinitionInput = z.infer<typeof CreateSuperAppDefinitionSchema>;
export type UpdateSuperAppDefinitionInput = z.infer<typeof UpdateSuperAppDefinitionSchema>;
export type InstallSuperAppInput = z.infer<typeof InstallSuperAppSchema>;
export type OnboardPartnerInput = z.infer<typeof OnboardPartnerSchema>;
export type UpdateOrgStatusInput = z.infer<typeof UpdateOrgStatusSchema>;
export type CreateUsersInput = z.infer<typeof CreateUsersSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateTeamRbacMatrixInput = z.infer<typeof CreateTeamRbacMatrixSchema>;
export type UpdateTeamRbacMatrixInput = z.infer<typeof UpdateTeamRbacMatrixSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
