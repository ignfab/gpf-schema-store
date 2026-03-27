import { describe, expect, it, vi } from 'vitest'
import type { Collection } from './types'

vi.mock('./services/storage', () => ({
  loadCollections: vi.fn(),
}))

import { getCollections } from './index'
import { loadCollections } from './services/storage'

const loadCollectionsMock = vi.mocked(loadCollections)

describe('getCollections (library API)', () => {
  it('loads collections on each call (no stale module cache)', () => {
    loadCollectionsMock
      .mockReturnValueOnce([
        {
          id: 'NS:first',
          namespace: 'NS',
          name: 'first',
          title: 'first',
          description: 'first',
          properties: [{ name: 'id', type: 'string' }],
        },
      ])
      .mockReturnValueOnce([
        {
          id: 'NS:second',
          namespace: 'NS',
          name: 'second',
          title: 'second',
          description: 'second',
          properties: [{ name: 'id', type: 'string' }],
        },
      ])

    expect(getCollections().map((c) => c.id)).toEqual(['NS:first'])
    expect(getCollections().map((c) => c.id)).toEqual(['NS:second'])
    expect(loadCollectionsMock).toHaveBeenCalledTimes(2)
  })

  it('returns a deep-cloned value so caller mutations do not leak', () => {
    const shared: Collection[] = [
      {
        id: 'NS:stable',
        namespace: 'NS',
        name: 'stable',
        title: 'stable',
        description: 'stable',
        properties: [{ name: 'id', type: 'string' }],
      },
    ]
    loadCollectionsMock.mockReturnValue(shared)

    const first = getCollections()
    first[0].title = 'mutated by caller'
    first[0].properties[0].type = 'number'

    const second = getCollections()
    expect(second[0].title).toBe('stable')
    expect(second[0].properties[0].type).toBe('string')
  })
})
