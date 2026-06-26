import { z } from 'zod';

/*
 * ============================================================================
 * Public Catalog Model from OGC API - Features
 * 
 * @see https://ogcapi.ogc.org/features/
 * 
 * ============================================================================
 */


/**
 * Model for the results of "GET /collections"
 * 
 * Note :
 * - that "extent", "links", "crs" and "storageCrs" are ignored for now
 * - "storageCrs" is currently modeled as 'x-ign-defaultCrs' in the schema (mistake?)
 */
export const zOgcCollectionBrief = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string()
}).strict();

export type OgcCollectionBrief = z.infer<typeof zOgcCollectionBrief>;


/**
 * An allowed value in a oneOf (equivalent to a CodeList value)
 */
export const zOgcCollectionPropertyEnumValue = z.object({
  const: z.string(),
  title: z.string(),
  description: z.string().optional(),
  'x-ign-representedFeatures': z.array(z.string()).optional(),
}).strict();

export type OgcCollectionPropertyEnumValue = z.infer<typeof zOgcCollectionPropertyEnumValue>;

/**
 * The JSON schema of a property
 */
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

/**
 * Model for the OGC API - Features - Schemas.
 * 
 * Note that :
 * 
 * - It should match the futur /collections/{collectionId}/schema on the GPF
 * - "id" is reserved for the schema ID as an URL
 * - "x-collection-id" with the collectionId
 * 
 * @see https://docs.ogc.org/is/23-058r2/23-058r2.html
 */
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
