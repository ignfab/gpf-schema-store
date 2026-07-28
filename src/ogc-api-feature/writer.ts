import { type CollectionPropertyType } from '@/pivot/types';
import { isGeometryType } from '@/pivot/helpers';
import {
  type OgcCollectionSchema,
  type OgcCollectionProperty,
  type OgcCollectionBrief,
  zOgcCollectionSchema,
  zOgcCollectionBrief
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

function toJsonSchemaTypeAndFormat(type: CollectionPropertyType): {
  type?: OgcCollectionProperty['type'];
  format?: string;
} {
  switch (type) {
    case 'string':
      return {type: 'string'};
    case 'boolean':
      return {type: 'boolean'};
    case 'integer':
      return {type: 'integer'};
    case 'float':
      return {type: 'number'};
    case 'date':
      return {type: 'string', format: 'date'};
    case 'date-time':
      return {type: 'string', format: 'date-time'};
    case 'point':
      return {format: 'geometry-point'};
    case 'linestring':
      return {format: 'geometry-linestring'};
    case 'polygon':
      return {format: 'geometry-polygon'};
    case 'multilinestring':
      return {format: 'geometry-multilinestring'};
    case 'multipolygon':
      return {format: 'geometry-multipolygon'};
    case 'multipoint':
      return {format: 'geometry-multipoint'};
    case 'geometry':
      return {format: 'geometry-geometry'};
  }
}


function renderProperty(property: EnrichedCollectionProperty): OgcCollectionProperty {
  const rendered: OgcCollectionProperty = {};

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

  const {type, format} = toJsonSchemaTypeAndFormat(property.type);
  if (type !== undefined) {
    rendered.type = type;
  }
  if (format !== undefined) {
    rendered.format = format;
  }

  if (isGeometryType(property.type)) {
    rendered['x-ogc-role'] = 'primary-geometry';
    if (property.defaultCrs !== undefined) {
      rendered['x-ign-defaultCrs'] = property.defaultCrs;
    }
    return rendered;
  }

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
 * Converts pivot collection to OgcCollectionBrief
 */
export function renderCollectionBrief(collection: EnrichedCollection): OgcCollectionBrief {
  return zOgcCollectionBrief.parse({
    id: collection.id,
    title: collection.title,
    description: collection.description,
  });
}


/**
 * Converts pivot collection to OGC API Feature - schema
 */
export function renderCollectionSchema(collection: EnrichedCollection): OgcCollectionSchema {
  // The public schema exposes properties as a keyed object, while the internal
  // model keeps them as an ordered array.
  const properties: Record<string, OgcCollectionProperty> = {};
  for (const property of collection.properties) {
    properties[property.name] = renderProperty(property);
  }

  const schema: Partial<OgcCollectionSchema> = {
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

  return zOgcCollectionSchema.parse(schema);
}
