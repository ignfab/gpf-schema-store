import { z } from 'zod';

/*
 * ============================================================================
 * Public Catalog Model from OGC API - Features - Part 5: Schemas (draft)
 * 
 * https://ogcapi.ogc.org/features/
 * 
 * ============================================================================
 */

export const zOgcCollectionPropertyEnumValue = z.object({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
  'x-ign-representedFeatures': z.array(z.string()).optional(),
}).strict();

export type OgcCollectionPropertyEnumValue = z.infer<typeof zOgcCollectionPropertyEnumValue>;

export const zOgcCollectionProperty = z.object({
  type: z.enum(['string', 'boolean', 'integer', 'number']).optional(),
  format: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  oneOf: z.array(zOgcCollectionPropertyEnumValue).optional(),
  'x-ogc-role': z.enum(['id', 'primary-geometry']).optional(),
  'x-ign-defaultCrs': z.string().optional(),
}).strict();

export type OgcCollectionProperty = z.infer<typeof zOgcCollectionProperty>;

export const zOgcCollectionSchema = z.object({
  $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
  'x-collection-id': z.string(),
  type: z.literal('object'),
  title: z.string(),
  'x-ign-theme': z.string().optional(),
  description: z.string(),
  'x-ign-selectionCriteria': z.string().optional(),
  'x-ign-representedFeatures': z.array(z.string()).optional(),
  properties: z.record(z.string(), zOgcCollectionProperty),
  required: z.array(z.string()),
}).strict();

export type OgcCollectionSchema = z.infer<typeof zOgcCollectionSchema>;
