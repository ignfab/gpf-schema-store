import { describe, expect, it } from 'vitest'
import type { CollectionOverwrite, SourceCollection } from '../../../src/types'
import { compare } from '../../../src/helpers/compare'

const base: SourceCollection = {
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

function makeOverwrite(
  properties: CollectionOverwrite['properties'],
): CollectionOverwrite {
  return {
    title: base.title,
    description: base.description,
    'x-ign-theme': 'Theme',
    required: [],
    properties,
  }
}

describe('compare', () => {

  it('returns an empty list when overwrite is undefined', () => {
    expect(compare(base, undefined)).toEqual([])
  });

  it('returns an empty list when property sets are identical', () => {
    const overwrite = makeOverwrite([
      { name: 'id', type: 'integer', title: 'ID', description: 'Identifier' },
      { name: 'name', type: 'boolean', title: 'Name', description: 'Name flag' },
    ])

    expect(compare(base, overwrite)).toEqual([])
  })

  it('reports properties that are missing in overwrite', () => {
    const overwrite = makeOverwrite([
      { name: 'id', type: 'string', title: 'ID', description: 'Identifier' },
    ])

    expect(compare(base, overwrite)).toEqual([
      'Property "name" missing in overwrite',
    ])
  })

  it('reports properties that are not present in WFS collection', () => {
    const overwrite = makeOverwrite([
      { name: 'id', type: 'string', title: 'ID', description: 'Identifier' },
      { name: 'name', type: 'string', title: 'Name', description: 'Name' },
      { name: 'extra', type: 'string', title: 'Extra', description: 'Extra' },
    ])

    expect(compare(base, overwrite)).toEqual([
      'Property "extra" is not present in WFS collection',
    ])
  })

  it('reports both missing and extra properties', () => {
    const overwrite = makeOverwrite([
      { name: 'id', type: 'string', title: 'ID', description: 'Identifier' },
      { name: 'extra', type: 'string', title: 'Extra', description: 'Extra' },
    ])

    expect(compare(base, overwrite)).toEqual([
      'Property "name" missing in overwrite',
      'Property "extra" is not present in WFS collection',
    ])
  })

})
