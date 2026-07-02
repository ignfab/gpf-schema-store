import { z } from 'zod';

/*
 * ============================================================================
 * Overwrite Model
 * TODO : align with pivot model 
 * (eg. EnrichedCollection has id, namespace and name)
 * ============================================================================
 */
const zRepresentedFeatures = z.array(z.string().min(1));

export const zCollectionOverwriteValue = z.object({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
  'x-ign-representedFeatures': zRepresentedFeatures.optional(),
}).strict();

export type CollectionOverwriteValue = z.infer<typeof zCollectionOverwriteValue>;


export const zCollectionOverwriteProperty = z.object({
  name: z.string().min(1),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  oneOf: z.array(zCollectionOverwriteValue).optional(),
}).strict();

export type CollectionOverwriteProperty = z.infer<typeof zCollectionOverwriteProperty>;


export const zCollectionOverwrite = z.object({
  title: z.string(),
  description: z.string(),
  'x-ign-theme': z.string(),
  'x-ign-selectionCriteria': z.string().optional(),
  'x-ign-representedFeatures': zRepresentedFeatures.optional(),
  required: z.array(z.string().min(1)),
  properties: z.array(zCollectionOverwriteProperty),
}).strict();

export type CollectionOverwrite = z.infer<typeof zCollectionOverwrite>;
