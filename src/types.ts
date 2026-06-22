import { z } from 'zod';

/*
 * ============================================================================
 * Package Metadata
 * ============================================================================
 */

export const packageMetadataSchema = z.looseObject({
  version: z.string().min(1),
});
