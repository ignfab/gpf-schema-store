import { z } from 'zod';
import type { SourceCollectionProperty } from './source/types';

/*
 * ============================================================================
 * Errors
 * ============================================================================
 */

/**
 * Thrown when a type is not supported.
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
 * Overwrite Model
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

/*
 * ============================================================================
 * Internal Enriched Model
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

/*
 * ============================================================================
 * Package Metadata
 * ============================================================================
 */

export const packageMetadataSchema = z.looseObject({
  version: z.string().min(1),
});
