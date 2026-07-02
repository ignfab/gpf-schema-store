import type { SourceCollectionProperty } from '@/source/types';
import { z } from 'zod';

/*
 * ============================================================================
 * Property Types
 * ============================================================================
 */

const SCALAR_PROPERTY_TYPES = [
  'string',
  'boolean',
  'float',   // WARNING : number with TableSchema and JsonSchema (API FEATURE)
  'integer',
] as const;

const GEOMETRY_PROPERTY_TYPES = [
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry',
] as const;

// Single source of truth: scalar and geometry types are each listed once.
const PROPERTY_TYPES = [...SCALAR_PROPERTY_TYPES, ...GEOMETRY_PROPERTY_TYPES] as const;

export const zCollectionPropertyType = z.enum(PROPERTY_TYPES);
export type CollectionPropertyType = z.infer<typeof zCollectionPropertyType>;

export const zGeometryPropertyType = z.enum(GEOMETRY_PROPERTY_TYPES);
export type GeometryPropertyType = z.infer<typeof zGeometryPropertyType>;

/*
 * ============================================================================
 * Internal Enriched Model - the pivot model
 * ============================================================================
 */

// Canonical internal model after applying overwrites.

export type EnrichedCollection = {
  id: string;
  namespace: string;
  name: string;
  title: string;
  description: string;
  'x-ign-theme'?: string;
  'x-ign-selectionCriteria'?: string;
  'x-ign-representedFeatures'?: string[];
  required?: string[];
  properties: EnrichedCollectionProperty[];
};

export type EnrichedCollectionProperty = SourceCollectionProperty & {
  title?: string;
  description?: string;
  oneOf?: EnrichedCollectionValue[];
};

export type EnrichedCollectionValue = {
  const: string;
  title: string;
  description?: string;
  'x-ign-representedFeatures'?: string[];
};

