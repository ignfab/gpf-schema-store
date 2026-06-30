import { CollectionPropertyType, zCollectionPropertyType, GeometryPropertyType, zGeometryPropertyType } from './types';


/*
 * ============================================================================
 * helpers for the pivot model
 * ============================================================================
 */
/**
 * Test if the value is a supported type name.
 */

export function isValidPropertyType(value: unknown): value is CollectionPropertyType {
  return zCollectionPropertyType.safeParse(value).success;
}
/**
 * Test if the value is a geometry type name.
 */

export function isGeometryType(value: unknown): value is GeometryPropertyType {
  return zGeometryPropertyType.safeParse(value).success;
}
