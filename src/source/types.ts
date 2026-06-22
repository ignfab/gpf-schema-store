import { z } from 'zod';

import { collectionPropertyTypeSchema } from '@/pivot/types';

/*
 * ============================================================================
 * Internal Source Model
 * ============================================================================
 */
// Raw snapshot loaded from WFS before overwrite-based enrichment.
// `namespace` and `name` are kept for file layout and search, but are not part
// of the public JSON Schema output.

export const sourceCollectionPropertySchema = z.object({
  name: z.string().min(1),
  type: collectionPropertyTypeSchema,
  // Internal geometry hint later rendered as `x-ign-defaultCrs`.
  defaultCrs: z.string().min(1).optional(),
}).strict();

export type SourceCollectionProperty = z.infer<typeof sourceCollectionPropertySchema>;

export const sourceCollectionSchema = z.object({
  id: z.string().min(1),
  namespace: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  properties: z.array(sourceCollectionPropertySchema),
}).strict();

export type SourceCollection = z.infer<typeof sourceCollectionSchema>;
// GetCapabilities shape before DescribeFeatureType fills `properties`.

export const sourceCollectionBriefSchema = sourceCollectionSchema.omit({ properties: true });

export type SourceCollectionBrief = z.infer<typeof sourceCollectionBriefSchema>;
