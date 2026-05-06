import { debuglog } from 'node:util';

import type {
  CollectionOverwrite,
  CollectionOverwriteProperty,
  EnrichedCollection,
  EnrichedCollectionProperty,
  SourceCollection,
  SourceCollectionProperty,
} from '../types';

const debug = debuglog('gpf-schema-store:merge');

/**
 * Merge a raw WFS collection with an optional editorial overwrite.
 *
 * Mapping schema
 *
 * Collection level:
 *
 * | Field                     | Source in result |
 * |---------------------------|------------------|
 * | id                        | WFS              |
 * | namespace                 | WFS              |
 * | name                      | WFS              |
 * | title                     | overwrite        |
 * | description               | overwrite        |
 * | x-ign-theme               | overwrite        |
 * | x-ign-selectionCriteria   | overwrite        |
 * | x-ign-representedFeatures | overwrite        |
 * | required                  | overwrite        |
 *
 * Property level:
 *
 * - result property list comes from the WFS properties array
 * - overwrite properties are matched by `name`
 * - properties declared only in overwrite are ignored
 * - WFS properties without overwrite stay as-is
 *
 * | Field       | Source in result |
 * |-------------|------------------|
 * | name        | WFS              |
 * | type        | WFS              |
 * | defaultCrs  | WFS              |
 * | title       | overwrite        |
 * | description | overwrite        |
 * | oneOf       | overwrite        |
 */

function mergeProperty(
  sourceProperty: SourceCollectionProperty,
  overwriteProperty?: CollectionOverwriteProperty,
): EnrichedCollectionProperty {

  if (!overwriteProperty) {
    return { ...sourceProperty };
  }

  const merged: EnrichedCollectionProperty = {
    ...sourceProperty,
    name: overwriteProperty.name,
    title: overwriteProperty.title,
    description: overwriteProperty.description,
  };

  if (overwriteProperty.oneOf !== undefined) {
    merged.oneOf = overwriteProperty.oneOf;
  }

  return merged;
}

export function merge(
  original: SourceCollection,
  overwrite: CollectionOverwrite | null,
): EnrichedCollection {

  if (!overwrite) {
    debug(`No overwrite found for collection "${original.id}", using original schema`);
    return original;
  }

  const overwritePropertiesByName = new Map(
    overwrite.properties.map((property) => [property.name, property]),
  );
  
  const properties = original.properties.map((property) =>
    mergeProperty(property, overwritePropertiesByName.get(property.name)),
  );

  const merged: EnrichedCollection = {
    id: original.id,
    namespace: original.namespace,
    name: original.name,
    title: overwrite.title,
    description: overwrite.description,
    'x-ign-theme': overwrite['x-ign-theme'],
    required: overwrite.required,
    properties,
  };

  if (overwrite['x-ign-selectionCriteria'] !== undefined) {
    merged['x-ign-selectionCriteria'] = overwrite['x-ign-selectionCriteria'];
  }

  if (overwrite['x-ign-representedFeatures'] !== undefined) {
    merged['x-ign-representedFeatures'] = overwrite['x-ign-representedFeatures'];
  }

  return merged;
}
