import { describe, expect, it } from 'vitest'
import type { Collection, CollectionOverwrite } from '../types'
import { merge } from './merge'

const base: Collection = {
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

describe('mergeCollectionSchema', () => {

  it('keeps collection id, namespace, name and original property names/types; other property fields from overwrite', () => {
    const overwrite: CollectionOverwrite = {
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Other title',
      description: 'Other description',
      properties: [
        { name: 'geom', type: 'geometry', title: 'Overwritten title' },
        { name: 'nature', type: 'integer', description: 'Modified nature' },
      ],
    }

    expect(merge(base, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Other title',
      description: 'Other description',
      properties: [
        { name: 'geom', type: 'geometry', title: 'Overwritten title' },
        { name: 'nature', type: 'string', description: 'Modified nature' },
      ],
    })
  })

  it('should ignore extra properties in overwrite (only merge matching properties)', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      properties: [
        { name: 'geom', type: 'string', title: 'Modified' },
        { name: 'nature', type: 'integer', description: 'Modified nature' },
        { name: 'extra', type: 'string' },
      ],
    }
    expect(merge(base, overwrite)).toEqual({
      ...base,
      properties: [
        { name: 'geom', type: 'geometry', title: 'Modified' },
        { name: 'nature', type: 'string', description: 'Modified nature' },
      ],
    })
  })

  it('allows legacy overwrite types but keeps the original WFS type', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      properties: [
        { name: 'nature', type: 'numeric', title: 'Nature' },
      ],
    }

    expect(merge(base, overwrite).properties).toEqual([
      { name: 'geom', type: 'geometry' },
      { name: 'nature', type: 'string', title: 'Nature' },
    ])
  })

  it('should keep id from original', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      id: 'OTHER:other',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })

  it('should keep name from original', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      name: 'other',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })
  
  it('should keep namespace from original', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      namespace: 'OTHER',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })

  it('should use title from overwrite', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      title: 'Modified title',
    }
    expect(merge(base, overwrite).title).toEqual(overwrite.title)
  })


  it('should use description from overwrite if overwrite is provided', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      description: 'Modified description',
    }
    expect(merge(base, overwrite).description).toEqual(overwrite.description)
  })

  it('should use description from original if overwrite is not provided', () => {
    const overwrite: CollectionOverwrite = {
      ...base
    }
    expect(merge(base, overwrite).description).toEqual(base.description)
  })

  it('keeps geometry properties from original when they define defaultCrs', () => {
    const baseWithGeometry: Collection = {
      ...base,
      properties: [
        {
          name: 'geom',
          type: 'geometry',
          title: 'Original geometry',
          description: 'Original geometry description',
          defaultCrs: 'EPSG:4326',
        },
        {
          name: 'label',
          type: 'string',
          title: 'Original label',
        },
      ],
    }

    const overwrite: CollectionOverwrite = {
      ...baseWithGeometry,
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
        },
      ],
    }

    expect(merge(baseWithGeometry, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Base title',
      description: 'Base description',
      properties: [
        {
          name: 'geom',
          type: 'geometry',
          title: 'Original geometry',
          description: 'Original geometry description',
          defaultCrs: 'EPSG:4326',
        },
        {
          name: 'label',
          type: 'string',
          title: 'Overwritten label',
        },
      ],
    })
  })

  it('propagates selectionCriteria from overwrite at collection level', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      selectionCriteria: 'Tous les bâtiments de plus de 20 m²',
    }
    expect(merge(base, overwrite).selectionCriteria).toEqual('Tous les bâtiments de plus de 20 m²')
  })

  it('propagates representedFeatures from overwrite at collection level', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      representedFeatures: ['Aéroport', 'Héliport'],
    }
    expect(merge(base, overwrite).representedFeatures).toEqual(['Aéroport', 'Héliport'])
  })

  it('does not set selectionCriteria or representedFeatures when overwrite omits them', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
    }
    const result = merge(base, overwrite)
    expect(result).not.toHaveProperty('selectionCriteria')
    expect(result).not.toHaveProperty('representedFeatures')
  })

  it('propagates allowedValues from overwrite at property level', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      properties: [
        { name: 'nature', type: 'string', allowedValues: [
          { value: 'Résidentiel', description: 'Bâtiment résidentiel' },
          { value: 'Industriel', description: 'Bâtiment industriel', representedFeatures: ['Usine', 'Entrepôt'] },
        ]},
      ],
    }
    const result = merge(base, overwrite)
    expect(result.properties[1]).toEqual({
      name: 'nature',
      type: 'string',
      allowedValues: [
        { value: 'Résidentiel', description: 'Bâtiment résidentiel' },
        { value: 'Industriel', description: 'Bâtiment industriel', representedFeatures: ['Usine', 'Entrepôt'] },
      ],
    })
  })

  it('propagates nullable from overwrite at property level', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      properties: [
        { name: 'nature', type: 'string', nullable: false },
      ],
    }
    const result = merge(base, overwrite)
    expect(result.properties[1].nullable).toBe(false)
  })

  it('propagates availableWhen on allowedValues from overwrite', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      properties: [
        { name: 'nature_detaillee', type: 'string', allowedValues: [
          { value: 'Cimetière militaire allemand', availableWhen: { property: 'nature', equalsAny: ['Militaire étranger'] } },
        ]},
      ],
    }
    const result = merge({ ...base, properties: [
      { name: 'geom', type: 'geometry' },
      { name: 'nature_detaillee', type: 'string' },
    ] }, overwrite)
    expect(result.properties[1].allowedValues).toEqual([
      { value: 'Cimetière militaire allemand', availableWhen: { property: 'nature', equalsAny: ['Militaire étranger'] } },
    ])
  })

  it('does not mutate source objects', () => {
    const overwrite: CollectionOverwrite = {
      ...base,
      title: 'Modified title',
    }
    const baseSnapshot = structuredClone(base)
    const overwriteSnapshot = structuredClone(overwrite)

    merge(base, overwrite)

    expect(base).toEqual(baseSnapshot)
    expect(overwrite).toEqual(overwriteSnapshot)
  })

})
