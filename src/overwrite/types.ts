import { z } from 'zod';

/*
 * ============================================================================
 * Overwrite Model
 * TODO : align with pivot model
 * ============================================================================
 */
const representedFeaturesSchema = z.array(z.string().min(1));

export const collectionOverwriteValueSchema = z.object({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
  'x-ign-representedFeatures': representedFeaturesSchema.optional(),
}).strict();

export const collectionOverwritePropertySchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  oneOf: z.array(collectionOverwriteValueSchema).optional(),
}).strict();

export const collectionOverwriteSchema = z.object({
  title: z.string(),
  description: z.string(),
  'x-ign-theme': z.string(),
  'x-ign-selectionCriteria': z.string().optional(),
  'x-ign-representedFeatures': representedFeaturesSchema.optional(),
  required: z.array(z.string().min(1)),
  properties: z.array(collectionOverwritePropertySchema),
}).strict();
// Overwrite input layered on top of WFS snapshots.

export type CollectionOverwrite = z.infer<typeof collectionOverwriteSchema>;
// Overwrite files may still contain legacy type names. The merge keeps the WFS
// property type and treats this field as permissive input only.

export type CollectionOverwriteProperty = z.infer<typeof collectionOverwritePropertySchema>;

export type CollectionOverwriteValue = z.infer<typeof collectionOverwriteValueSchema>;
