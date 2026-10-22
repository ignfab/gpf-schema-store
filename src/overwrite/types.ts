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


/*
 * Traceability (kept in data/overwrites only, not propagated to data/catalog)
 */

/**
 * Source used to write the overwrite
 * (inspired by Frictionless Data Package "sources").
 */
export const zCollectionOverwriteSource = z.object({
  title: z.string().min(1),
  path: z.string().min(1),
  version: z.string().optional(),
}).strict();

export type CollectionOverwriteSource = z.infer<typeof zCollectionOverwriteSource>;

const zIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

/**
 * How the overwrite was produced (missing => unknown / legacy).
 */
export const zCollectionOverwriteGenerated = z.object({
  by: z.enum(['ai', 'human']),
  tool: z.string().min(1).optional(),
  date: zIsoDate.optional(),
  reviewed: z.object({
    by: z.string().min(1),
    date: zIsoDate.optional(),
  }).strict().optional(),
}).strict();

export type CollectionOverwriteGenerated = z.infer<typeof zCollectionOverwriteGenerated>;


export const zCollectionOverwrite = z.object({
  title: z.string(),
  'x-ign-sources': z.array(zCollectionOverwriteSource).optional(),
  'x-ign-generated': zCollectionOverwriteGenerated.optional(),
  description: z.string(),
  'x-ign-theme': z.string(),
  'x-ign-selectionCriteria': z.string().optional(),
  'x-ign-representedFeatures': zRepresentedFeatures.optional(),
  required: z.array(z.string().min(1)),
  properties: z.array(zCollectionOverwriteProperty),
}).strict();

export type CollectionOverwrite = z.infer<typeof zCollectionOverwrite>;
