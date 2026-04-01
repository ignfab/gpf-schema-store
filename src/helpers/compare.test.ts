import { describe, expect, it } from 'vitest'
import type { Collection } from '../types'
import { compare } from './compare'

const base: Collection = {
  id: 'NS:collection',
  namespace: 'NS',
  name: 'collection',
  title: 'Collection',
  description: 'Collection description',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
  ],
}

describe('compare', () => {
  it('returns an empty list when property sets are identical', () => {
    const overwrite: Collection = {
      ...base,
      properties: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'text' },
      ],
    }

    expect(compare(base, overwrite)).toEqual([])
  })

  it('reports properties that are missing in overwrite', () => {
    const overwrite: Collection = {
      ...base,
      properties: [{ name: 'id', type: 'string' }],
    }

    expect(compare(base, overwrite)).toEqual([
      '"name" missing in overwrite',
    ])
  })

  it('reports properties that are not present in WFS collection', () => {
    const overwrite: Collection = {
      ...base,
      properties: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'extra', type: 'string' },
      ],
    }

    expect(compare(base, overwrite)).toEqual([
      'Property "extra" is not present in WFS collection',
    ])
  })

  it('reports both missing and extra properties', () => {
    const overwrite: Collection = {
      ...base,
      properties: [
        { name: 'id', type: 'string' },
        { name: 'extra', type: 'string' },
      ],
    }

    expect(compare(base, overwrite)).toEqual([
      'Property "name" missing in overwrite',
      'Property "extra" is not present in WFS collection',
    ])
  })

})
