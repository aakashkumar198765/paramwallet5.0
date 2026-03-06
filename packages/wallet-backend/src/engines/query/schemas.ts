import { z } from 'zod';

export const DocumentListQuerySchema = z.object({
  superAppId: z.string().optional(),
  smId: z.string().optional(),
  state: z.string().optional(),
  subState: z.string().optional(),
  phase: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  plant: z.string().optional(),
  partner_id: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  include_actions: z.coerce.boolean().default(false),
  include_diff: z.coerce.boolean().default(false),
});

export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;
