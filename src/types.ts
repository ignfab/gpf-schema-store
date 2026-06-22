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
