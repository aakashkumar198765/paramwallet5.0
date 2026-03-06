import { z } from 'zod';

export const DocumentListQuerySchema = z.object({
  smId: z.string().optional(),
  state: z.string().optional(),
  subState: z.string().optional(),
  phase: z.string().optional(),
  partner_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  cursor_timestamp: z.coerce.number().optional(),
  cursor_id: z.string().optional(),
  include_actions: z.coerce.boolean().default(false),
  include_diff: z.coerce.boolean().default(false),
});

export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;
