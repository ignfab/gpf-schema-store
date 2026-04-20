import type {
  Collection,
  CollectionProperty,
  CollectionPropertyType,
  CollectionSchema,
  CollectionSchemaProperty,
} from '../types';

const JSON_SCHEMA_DRAFT = 'https://json-schema.org/draft/2020-12/schema' as const;

const GEOMETRY_TYPES = new Set<CollectionPropertyType>([
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry',
]);

function isGeometryType(type: CollectionPropertyType): boolean {
  return GEOMETRY_TYPES.has(type);
}

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

function renderProperty(property: CollectionProperty): CollectionSchemaProperty {
  const rendered: CollectionSchemaProperty = {};

  if (property.title !== undefined) {
    rendered.title = property.title;
  }
  if (property.description !== undefined) {
    rendered.description = property.description;
  }
  if (property.enum !== undefined) {
    rendered.enum = [...property.enum];
  }
  if (property.oneOf !== undefined) {
    rendered.oneOf = structuredClone(property.oneOf);
  }
  if (property['x-ign-representedFeatures'] !== undefined) {
    rendered['x-ign-representedFeatures'] = [...property['x-ign-representedFeatures']];
  }

  if (isGeometryType(property.type)) {
    rendered.format = `geometry-${property.type}`;
    rendered['x-ogc-role'] = 'primary-geometry';
    return rendered;
  }

  rendered.type = toJsonSchemaScalarType(property.type);
  return rendered;
}

export function renderCollectionSchema(collection: Collection): CollectionSchema {
  const properties = Object.fromEntries(
    collection.properties.map((property) => [property.name, renderProperty(property)]),
  );

  return {
    $schema: JSON_SCHEMA_DRAFT,
    'x-collection-id': collection.id,
    type: 'object',
    title: collection.title,
    ...(collection['x-ign-theme'] ? { 'x-ign-theme': collection['x-ign-theme'] } : {}),
    description: collection.description,
    ...(collection['x-ign-selectionCriteria'] ? { 'x-ign-selectionCriteria': collection['x-ign-selectionCriteria'] } : {}),
    ...(collection['x-ign-representedFeatures'] ? { 'x-ign-representedFeatures': [...collection['x-ign-representedFeatures']] } : {}),
    properties,
    required: [...(collection.required ?? [])],
  };
}
