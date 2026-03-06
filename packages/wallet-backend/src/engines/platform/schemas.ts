import { z } from 'zod';

// ── Workspace ─────────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/, 'Subdomain: lowercase alphanumeric + hyphens only'),
  workspaceName: z.string().min(1).max(120),
  exchangeParamId: z.string().min(1),
});

export const UpdateWorkspaceSchema = z.object({
  workspaceName: z.string().min(1).max(120),
});

export const CreatePlantSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().min(2).max(2),
  }).optional(),
});

export const UpdatePlantSchema = CreatePlantSchema.partial();

// ── SuperApp ──────────────────────────────────────────────────────────────────

export const InstallSuperAppSchema = z.object({
  superAppId: z.string().min(1),
});

export const UpdateSuperAppStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'archived']),
});

// ── Definitions ───────────────────────────────────────────────────────────────

export const CreateSuperAppDefinitionSchema = z.object({
  name: z.string().min(1),
  desc: z.string().optional().default(''),
  version: z.string().default('1.0.0'),
  roles: z.array(z.object({
    name: z.string().min(1),
    desc: z.string().optional().default(''),
    teams: z.array(z.object({
      name: z.string().min(1),
      desc: z.string().optional().default(''),
    })),
  })).min(1),
  linkedSMs: z.array(z.string()).default([]),
  sponsor: z.string().min(1),
  isActive: z.number().int().min(0).max(1).default(1),
});

export const UpdateSuperAppDefinitionSchema = CreateSuperAppDefinitionSchema.partial();

export const CreateTeamRbacMatrixSchema = z.object({
  superAppId: z.string().min(1),
  smId: z.string().min(1),
  smName: z.string().min(1),
  permissions: z.array(z.object({
    state: z.string().min(1),
    subState: z.string().nullable().default(null),
    microState: z.string().nullable().default(null),
    access: z.record(z.enum(['RW', 'RO', 'N/A'])),
  })).min(1),
  version: z.string().default('1.0.0'),
});

export const UpdateTeamRbacMatrixSchema = z.object({
  permissions: z.array(z.object({
    state: z.string().min(1),
    subState: z.string().nullable().default(null),
    microState: z.string().nullable().default(null),
    access: z.record(z.enum(['RW', 'RO', 'N/A'])),
  })).min(1),
});

// ── Orgs ──────────────────────────────────────────────────────────────────────

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
  orgAdmin: z.string().email().optional(),
  plants: z.array(z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  })).optional().default([]),
});

export const UpdateOrgStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const AddUsersSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    orgParamId: z.string().min(1),
    partnerId: z.string().optional(),
    plantTeams: z.array(z.object({
      plant: z.string().min(1),
      teams: z.array(z.string().min(1)),
    })),
    isOrgAdmin: z.boolean().default(false),
  })).min(1),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  plantTeams: z.array(z.object({
    plant: z.string().min(1),
    teams: z.array(z.string().min(1)),
  })).optional(),
  isOrgAdmin: z.boolean().optional(),
});

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1),
});

// ── Manifest ──────────────────────────────────────────────────────────────────

export const ManifestSchema = z.object({
  orgs: z.array(OnboardPartnerSchema).optional().default([]),
  users: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.string().min(1),
    orgParamId: z.string().min(1),
    partnerId: z.string().optional(),
    plantTeams: z.array(z.object({
      plant: z.string().min(1),
      teams: z.array(z.string().min(1)),
    })),
    isOrgAdmin: z.boolean().default(false),
  })).optional().default([]),
});

export type CreateWorkspaceBody = z.infer<typeof CreateWorkspaceSchema>;
export type CreatePlantBody = z.infer<typeof CreatePlantSchema>;
export type InstallSuperAppBody = z.infer<typeof InstallSuperAppSchema>;
export type CreateSuperAppDefinitionBody = z.infer<typeof CreateSuperAppDefinitionSchema>;
export type CreateTeamRbacMatrixBody = z.infer<typeof CreateTeamRbacMatrixSchema>;
export type OnboardPartnerBody = z.infer<typeof OnboardPartnerSchema>;
export type AddUsersBody = z.infer<typeof AddUsersSchema>;
export type ManifestBody = z.infer<typeof ManifestSchema>;
