import { z } from 'zod';

import { zCollectionPropertyType } from '@/pivot/types';

/*
 * ============================================================================
 * Internal Source Model
 * ============================================================================
 */
// Raw snapshot loaded from WFS before overwrite-based enrichment.
// `namespace` and `name` are kept for file layout and search, but are not part
// of the public JSON Schema output.

export const zSourceCollectionProperty = z.object({
  name: z.string().min(1),
  type: zCollectionPropertyType,
  // Internal geometry hint later rendered as `x-ign-defaultCrs`.
  defaultCrs: z.string().min(1).optional(),
}).strict();

export type SourceCollectionProperty = z.infer<typeof zSourceCollectionProperty>;


export const zSourceCollection = z.object({
  id: z.string().min(1),
  namespace: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  properties: z.array(zSourceCollectionProperty),
}).strict();

export type SourceCollection = z.infer<typeof zSourceCollection>;


export const zSourceCollectionBrief = zSourceCollection.omit({ properties: true });
/**
 * Informations from GetCapabilities before DescribeFeatureType fills `properties`
 */
export type SourceCollectionBrief = z.infer<typeof zSourceCollectionBrief>;
