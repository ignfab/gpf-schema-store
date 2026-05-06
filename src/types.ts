import { z } from 'zod';

/*
 * ============================================================================
 * Errors
 * ============================================================================
 */

export class UnexpectedTypeError extends Error {
  constructor(value: unknown, context?: string) {
    const message = context
      ? `Unexpected type: "${value}" ${context}`
      : `Unexpected type: "${value}"`;
    super(message);
    this.name = 'UnexpectedTypeError';
  }
}

/*
 * ============================================================================
 * Namespace Filters
 * ============================================================================
 */

// Metadata assigned to namespaces through data/namespace-filters.yaml.
export const collectionMetadataSchema = z.object({
  ignored: z.boolean().describe('Indicates whether the namespace should be ignored'),
  ignoredReason: z.string().optional().describe('The reason for ignoring the namespace'),
  product: z.string().optional().describe('The product associated with the namespace'),
}).strict();

export type CollectionMetadata = z.infer<typeof collectionMetadataSchema>;

export const namespaceFilterRuleSchema = z.object({
  id: z.string().min(1).describe('The unique identifier of the rule'),
  patterns: z.array(z.string()).describe('The patterns to match against the namespace'),
  metadata: collectionMetadataSchema.describe('The metadata to assign if the namespace matches the patterns'),
});

export type NamespaceFilterRule = z.infer<typeof namespaceFilterRuleSchema>;

export const namespaceFiltersSchema = z.object({
  rules: z.array(namespaceFilterRuleSchema),
});

/*
 * ============================================================================
 * Property Types
 * ============================================================================
 */

// Shared property types seen in WFS snapshots and carried through enrichment.
// Keep this list aligned with the ogc-client output, plus the extra "geometry"
// fallback used when a geometry type cannot be made more specific.
const PROPERTY_TYPES = [
  'string',
  'boolean',
  'float',
  'integer',
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry',
] as const;

export type CollectionPropertyType = typeof PROPERTY_TYPES[number];

const VALID_PROPERTY_TYPES: Set<string> = new Set(PROPERTY_TYPES);

export function isValidPropertyType(value: unknown): value is CollectionPropertyType {
  return typeof value === 'string' && VALID_PROPERTY_TYPES.has(value);
}

export function assertIsValidPropertyType(
  value: unknown,
  context?: string,
): CollectionPropertyType {
  if (!isValidPropertyType(value)) {
    throw new UnexpectedTypeError(value, context);
  }
  return value;
}

/*
 * ============================================================================
 * Internal Source Model
 * ============================================================================
 */

// Raw snapshot loaded from WFS before any editorial enrichment.
// `namespace` and `name` are kept for file layout and search, but are not part
// of the public JSON Schema output.
export type SourceCollection = {
  id: string;
  namespace: string;
  name: string;
  title: string;
  description: string;
  properties: SourceCollectionProperty[];
};

export type SourceCollectionProperty = {
  name: string;
  type: CollectionPropertyType;
  // Internal geometry hint later rendered as `x-ign-defaultCrs`.
  defaultCrs?: string;
};

// GetCapabilities shape before DescribeFeatureType fills `properties`.
export type SourceCollectionBrief = Omit<SourceCollection, 'properties'>;

/*
 * ============================================================================
 * Overwrite Model
 * ============================================================================
 */

// Editorial input layered on top of WFS snapshots.
export type CollectionOverwrite = {
  title: string;
  'x-ign-theme': string;
  description: string;
  'x-ign-selectionCriteria'?: string;
  'x-ign-representedFeatures'?: string[];
  required: string[];
  properties: CollectionOverwriteProperty[];
};

// Overwrite files may still contain legacy type names. The merge keeps the WFS
// property type and treats this field as permissive input only.
export type CollectionOverwriteProperty = {
  name: string;
  type: string;
  title: string;
  description: string;
  oneOf?: CollectionOverwriteValue[];
};

export type CollectionOverwriteValue = {
  const: string;
  title: string;
  description?: string;
  'x-ign-representedFeatures'?: string[];
};

/*
 * ============================================================================
 * Internal Enriched Model
 * ============================================================================
 */

// Canonical internal model after applying editorial overrides.
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

/*
 * ============================================================================
 * Public Catalog Model
 * ============================================================================
 */

// Public catalog view exposed by the package.
export type CollectionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema';
  'x-collection-id': string;
  type: 'object';
  title: string;
  'x-ign-theme'?: string;
  description: string;
  'x-ign-selectionCriteria'?: string;
  'x-ign-representedFeatures'?: string[];
  properties: Record<string, CollectionSchemaProperty>;
  required: string[];
};

export type CollectionSchemaProperty = {
  type?: 'string' | 'boolean' | 'integer' | 'number';
  format?: string;
  title?: string;
  description?: string;
  oneOf?: CollectionSchemaValue[];
  'x-ogc-role'?: 'id' | 'primary-geometry';
  'x-ign-defaultCrs'?: string;
};

export type CollectionSchemaValue = {
  const: string;
  title: string;
  description?: string;
  'x-ign-representedFeatures'?: string[];
};
