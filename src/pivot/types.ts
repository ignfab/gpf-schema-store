import { z } from 'zod';

/*
 * ============================================================================
 * Property Types
 * ============================================================================
 */

/**
 * The list of the supported property types currently aligned with
 * @camptocamp/ogc-client.
 */
const PROPERTY_TYPES = [
  'string',
  'boolean',
  'float',   // WARNING : number with TableSchema and JsonSchema (API FEATURE)
  'integer',
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry',
] as const;

const GEOMETRY_TYPES = [
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry'
] as const;

export const collectionPropertyTypeSchema = z.enum(PROPERTY_TYPES);
export type CollectionPropertyType = z.infer<typeof collectionPropertyTypeSchema>;

/**
 * Test if the value is a supported type name.
 */
export function isValidPropertyType(value: unknown): value is CollectionPropertyType {
  return collectionPropertyTypeSchema.safeParse(value).success;
}

/**
 * Test if the value is a geometry type name.
 */
export function isGeometryPropertyType(value: unknown): boolean {
  if ( ! isValidPropertyType(value) ){
    return false;
  }
  return (GEOMETRY_TYPES as readonly CollectionPropertyType[]).includes(value);
}
