import { describe, expect, it } from 'vitest'
import type { CollectionOverwrite, SourceCollection } from '../../../src/types'
import { merge } from '../../../src/enrichment/merge'

const base: SourceCollection = {
  id: 'NS:collection',
  namespace: 'NS',
  name: 'collection',
  title: 'Base title',
  description: 'Base description',
  properties: [
    { name: 'geom', type: 'geometry' },
    { name: 'nature', type: 'string' },
  ],
}

function makeOverwrite(
  overrides: Partial<CollectionOverwrite> = {},
): CollectionOverwrite {
  return {
    title: base.title,
    description: base.description,
    'x-ign-theme': '',
    required: [],
    properties: [],
    ...overrides,
  }
}

describe('mergeCollectionSchema', () => {

  it('keeps collection id, namespace, name and original property names/types; other property fields from overwrite', () => {
    const overwrite = makeOverwrite({
      title: 'Other title',
      description: 'Other description',
      properties: [
        { name: 'geom', type: 'geometry', title: 'Overwritten title', description: 'Geometry' },
        { name: 'nature', type: 'integer', title: 'Nature', description: 'Modified nature' },
      ],
    })

    expect(merge(base, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Other title',
      description: 'Other description',
      'x-ign-theme': '',
      required: [],
      properties: [
        { name: 'geom', type: 'geometry', title: 'Overwritten title', description: 'Geometry' },
        { name: 'nature', type: 'string', title: 'Nature', description: 'Modified nature' },
      ],
    })
  })

  it('should ignore extra properties in overwrite (only merge matching properties)', () => {
    const overwrite = makeOverwrite({
      properties: [
        { name: 'geom', type: 'string', title: 'Modified', description: 'Modified geometry' },
        { name: 'nature', type: 'integer', title: 'Nature', description: 'Modified nature' },
        { name: 'extra', type: 'string', title: 'Extra', description: 'Extra property' },
      ],
    })
    expect(merge(base, overwrite)).toEqual({
      ...base,
      'x-ign-theme': '',
      required: [],
      properties: [
        { name: 'geom', type: 'geometry', title: 'Modified', description: 'Modified geometry' },
        { name: 'nature', type: 'string', title: 'Nature', description: 'Modified nature' },
      ],
    })
  })

  it('allows legacy overwrite types but keeps the original WFS type', () => {
    const overwrite = makeOverwrite({
      properties: [
        { name: 'nature', type: 'numeric', title: 'Nature', description: 'Nature description' },
      ],
    })

    expect(merge(base, overwrite).properties).toEqual([
      { name: 'geom', type: 'geometry' },
      { name: 'nature', type: 'string', title: 'Nature', description: 'Nature description' },
    ])
  })

  it('should use title from overwrite', () => {
    const overwrite = makeOverwrite({
      title: 'Modified title',
      properties: [],
    })
    expect(merge(base, overwrite).title).toEqual(overwrite.title)
  })


  it('should use description from overwrite if overwrite is provided', () => {
    const overwrite = makeOverwrite({
      description: 'Modified description',
      properties: [],
    })
    expect(merge(base, overwrite).description).toEqual(overwrite.description)
  })

  it('should use description from original if overwrite is not provided', () => {
    expect(merge(base, null).description).toEqual(base.description)
  })

  it('keeps geometry properties from original when they define defaultCrs', () => {
    const baseWithGeometry: SourceCollection = {
      ...base,
      properties: [
        {
          name: 'geom',
          type: 'geometry',
          defaultCrs: 'EPSG:4326',
        },
        {
          name: 'label',
          type: 'string',
        },
      ],
    }

    const overwrite: CollectionOverwrite = {
      title: baseWithGeometry.title,
      description: baseWithGeometry.description,
      'x-ign-theme': 'Theme',
      required: [],
      properties: [
        {
          name: 'geom',
          type: 'string',
          title: 'Overwritten geometry',
          description: 'Overwritten geometry description',
        },
        {
          name: 'label',
          type: 'string',
          title: 'Overwritten label',
          description: 'Overwritten label description',
        },
      ],
    }

    expect(merge(baseWithGeometry, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Base title',
      description: 'Base description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [
        {
          name: 'geom',
          type: 'geometry',
          title: 'Overwritten geometry',
          description: 'Overwritten geometry description',
          defaultCrs: 'EPSG:4326',
        },
        {
          name: 'label',
          type: 'string',
          title: 'Overwritten label',
          description: 'Overwritten label description',
        },
      ],
    })
  })

  it('propagates collection and property enrichment fields from overwrite', () => {
    const overwrite: CollectionOverwrite = {
      title: 'Overwritten title',
      description: 'Overwritten description',
      'x-ign-theme': 'Theme',
      'x-ign-selectionCriteria': 'Selection criteria',
      'x-ign-representedFeatures': ['Feature'],
      required: ['nature'],
      properties: [
        {
          name: 'nature',
          type: 'number',
          title: 'Nature',
          description: 'Nature description',
          oneOf: [
            {
              const: 'A',
              title: 'Value A',
              description: 'Value A description',
              'x-ign-representedFeatures': ['Represented A'],
            },
          ],
        },
      ],
    }

    expect(merge(base, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Overwritten title',
      description: 'Overwritten description',
      'x-ign-theme': 'Theme',
      'x-ign-selectionCriteria': 'Selection criteria',
      'x-ign-representedFeatures': ['Feature'],
      required: ['nature'],
      properties: [
        { name: 'geom', type: 'geometry' },
        {
          name: 'nature',
          type: 'string',
          title: 'Nature',
          description: 'Nature description',
          oneOf: [
            {
              const: 'A',
              title: 'Value A',
              description: 'Value A description',
              'x-ign-representedFeatures': ['Represented A'],
            },
          ],
        },
      ],
    })
  })


  it('does not mutate source objects', () => {
    const overwrite = makeOverwrite({
      title: 'Modified title',
      properties: [],
    })
    const baseSnapshot = structuredClone(base)
    const overwriteSnapshot = structuredClone(overwrite)

    merge(base, overwrite)

    expect(base).toEqual(baseSnapshot)
    expect(overwrite).toEqual(overwriteSnapshot)
  })

})
