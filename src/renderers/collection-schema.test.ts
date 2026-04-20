import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import { renderCollectionSchema } from './collection-schema';

describe('renderCollectionSchema', () => {
  it('renders scalar and geometry properties as an OGC logical JSON Schema', () => {
    const collection: Collection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: ['id', 'geom'],
      properties: [
        { name: 'id', type: 'string', title: 'Identifier' },
        { name: 'height', type: 'float', title: 'Height' },
        { name: 'count', type: 'integer', title: 'Count' },
        {
          name: 'status',
          type: 'string',
          title: 'Status',
          oneOf: [
            {
              const: 'A',
              title: 'Active',
              description: 'Active status',
              'x-ign-representedFeatures': ['Active feature'],
            },
          ],
        },
        {
          name: 'geom',
          type: 'point',
          title: 'Geometry',
          defaultCrs: 'EPSG:4326',
        },
      ],
    };

    const schema = renderCollectionSchema(collection);

    expect(Object.keys(schema)).toEqual([
      '$schema',
      'x-collection-id',
      'type',
      'title',
      'x-ign-theme',
      'description',
      'properties',
      'required',
    ]);
    expect(Object.keys(schema).at(-1)).toBe('required');
    expect(schema).not.toHaveProperty('id');
    expect(schema).not.toHaveProperty('namespace');
    expect(schema).not.toHaveProperty('name');
    expect(schema).not.toHaveProperty('x-wfs-id');
    expect(schema).not.toHaveProperty('x-wfs-namespace');
    expect(schema).not.toHaveProperty('x-wfs-name');
    expect(schema).not.toHaveProperty('x-wfs-typename');

    expect(schema).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      'x-collection-id': 'NS:feature',
      type: 'object',
      title: 'Feature',
      'x-ign-theme': 'Theme',
      description: 'Feature description',
      properties: {
        id: {
          type: 'string',
          title: 'Identifier',
        },
        height: {
          type: 'number',
          title: 'Height',
        },
        count: {
          type: 'integer',
          title: 'Count',
        },
        status: {
          type: 'string',
          title: 'Status',
          oneOf: [
            {
              const: 'A',
              title: 'Active',
              description: 'Active status',
              'x-ign-representedFeatures': ['Active feature'],
            },
          ],
        },
        geom: {
          title: 'Geometry',
          format: 'geometry-point',
          'x-ogc-role': 'primary-geometry',
        },
      },
      required: ['id', 'geom'],
    });
  });

  it('orders all optional collection annotations before properties and required', () => {
    const schema = renderCollectionSchema({
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      'x-ign-selectionCriteria': 'Selection criteria',
      'x-ign-representedFeatures': ['Represented feature'],
      properties: [],
    });

    expect(Object.keys(schema)).toEqual([
      '$schema',
      'x-collection-id',
      'type',
      'title',
      'x-ign-theme',
      'description',
      'x-ign-selectionCriteria',
      'x-ign-representedFeatures',
      'properties',
      'required',
    ]);
    expect(schema.required).toEqual([]);
  });

  it('renders real BDTOPO geometry types', () => {
    const pointSchema = renderCollectionSchema({
      id: 'BDTOPO_V3:point_de_repere',
      namespace: 'BDTOPO_V3',
      name: 'point_de_repere',
      title: 'Point de repère',
      description: 'Point de repère',
      properties: [{ name: 'geometrie', type: 'point' }],
    });

    const multipolygonSchema = renderCollectionSchema({
      id: 'BDTOPO_V3:batiment',
      namespace: 'BDTOPO_V3',
      name: 'batiment',
      title: 'Bâtiment',
      description: 'Bâtiment',
      properties: [{ name: 'geometrie', type: 'multipolygon' }],
    });

    expect(pointSchema.properties.geometrie).toMatchObject({
      format: 'geometry-point',
      'x-ogc-role': 'primary-geometry',
    });
    expect(multipolygonSchema.properties.geometrie).toMatchObject({
      format: 'geometry-multipolygon',
      'x-ogc-role': 'primary-geometry',
    });
  });
});
