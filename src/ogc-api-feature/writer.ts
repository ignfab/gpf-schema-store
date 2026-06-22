import { isGeometryType, type CollectionPropertyType } from '../pivot/types';
import type {
  CollectionSchema,
  CollectionSchemaProperty
} from './types';
import type {
  EnrichedCollection,
  EnrichedCollectionProperty
} from '@/pivot/types';

/*
 * =============================================================================
 * JSON Schema rendering
 * =============================================================================
 *
 * This module projects the internal EnrichedCollection model onto the public
 * CollectionSchema model exposed by the package.
 */

const JSON_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema' as const;

/*
 * =============================================================================
 * Property helpers
 * =============================================================================
 */

/**
 * TODO : remove this hack. Note that :
 * - "cleabs" should be marked as primaryKey in overwrites/BDTOPO_V3/{table}.json
 * - Both TableSchema and IGNF/validator allows primaryKey: string|string[]
 */
function isOgcIdentifierProperty(property: EnrichedCollectionProperty): boolean {
  return property.name === 'cleabs';
}

/*
 * =============================================================================
 * Property rendering
 * =============================================================================
 */

function toJsonSchemaScalarType(type: CollectionPropertyType): CollectionSchemaProperty['type'] {
  switch (type) {
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'integer':
      return 'integer';
    case 'float':
      return 'number';
    case 'point':
    case 'linestring':
    case 'polygon':
    case 'multilinestring':
    case 'multipolygon':
    case 'multipoint':
    case 'geometry':
      return undefined;
  }
}

function renderProperty(property: EnrichedCollectionProperty): CollectionSchemaProperty {
  const rendered: CollectionSchemaProperty = {};

  // Copy the descriptive metadata shared by scalar and geometry properties.
  if (property.title !== undefined) {
    rendered.title = property.title;
  }
  if (property.description !== undefined) {
    rendered.description = property.description;
  }
  if (property.oneOf !== undefined) {
    rendered.oneOf = structuredClone(property.oneOf);
  }

  // Geometry properties are rendered as logical geometry fields rather than
  // standard JSON Schema scalar types.
  if (isGeometryType(property.type)) {
    rendered.format = `geometry-${property.type}`;
    rendered['x-ogc-role'] = 'primary-geometry';
    if (property.defaultCrs !== undefined) {
      rendered['x-ign-defaultCrs'] = property.defaultCrs;
    }
    return rendered;
  }

  // Non-geometry properties are rendered with a standard JSON Schema type.
  rendered.type = toJsonSchemaScalarType(property.type);
  if (isOgcIdentifierProperty(property)) {
    rendered['x-ogc-role'] = 'id';
  }
  return rendered;
}

/*
 * =============================================================================
 * Collection rendering
 * =============================================================================
 */

/**
 * Converts pivot collection to OGC API Feature - schema
 */
export function renderCollectionSchema(collection: EnrichedCollection): CollectionSchema {
  // The public schema exposes properties as a keyed object, while the internal
  // model keeps them as an ordered array.
  const properties: Record<string, CollectionSchemaProperty> = {};
  for (const property of collection.properties) {
    properties[property.name] = renderProperty(property);
  }

  const schema: Partial<CollectionSchema> = {
    $schema: JSON_SCHEMA_DRAFT,
    'x-collection-id': collection.id,
    type: 'object',
    title: collection.title,
  };

  if (collection['x-ign-theme'] !== undefined) {
    schema['x-ign-theme'] = collection['x-ign-theme'];
  }

  schema.description = collection.description;

  if (collection['x-ign-selectionCriteria'] !== undefined) {
    schema['x-ign-selectionCriteria'] = collection['x-ign-selectionCriteria'];
  }

  if (collection['x-ign-representedFeatures'] !== undefined) {
    schema['x-ign-representedFeatures'] = [...collection['x-ign-representedFeatures']];
  }

  schema.properties = properties;
  schema.required = collection.required ? [...collection.required] : [];

  return schema as CollectionSchema;
}
