import { describe, expect, it } from 'vitest'
import type { Collection } from '../types'
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
    const overwrite: Collection = {
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
    const overwrite: Collection = {
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
    const overwrite = {
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
    const overwrite: Collection = {
      ...base,
      id: 'OTHER:other',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })

  it('should keep name from original', () => {
    const overwrite: Collection = {
      ...base,
      name: 'other',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })
  
  it('should keep namespace from original', () => {
    const overwrite: Collection = {
      ...base,
      namespace: 'OTHER',
    }
    expect(merge(base, overwrite)).toEqual(base)
  })

  it('should use title from overwrite', () => {
    const overwrite: Collection = {
      ...base,
      title: 'Modified title',
    }
    expect(merge(base, overwrite).title).toEqual(overwrite.title)
  })


  it('should use description from overwrite if overwrite is provided', () => {
    const overwrite: Collection = {
      ...base,
      description: 'Modified description',
    }
    expect(merge(base, overwrite).description).toEqual(overwrite.description)
  })

  it('should use description from original if overwrite is not provided', () => {
    const overwrite: Collection = {
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

    const overwrite: Collection = {
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


  it('does not mutate source objects', () => {
    const overwrite: Collection = {
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
