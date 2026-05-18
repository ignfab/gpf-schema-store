import { describe, expect, it, vi } from 'vitest'
import type { EnrichedCollection } from '../../src/types'

vi.mock('../../src/enrichment/load-enriched-collections', () => ({
  loadEnrichedCollections: vi.fn(),
}))

import { getCollections } from '../../src/index'
import { loadEnrichedCollections } from '../../src/enrichment/load-enriched-collections'

const loadEnrichedCollectionsMock = vi.mocked(loadEnrichedCollections)

describe('getCollections (library API)', () => {
  it('loads collections on each call (no stale module cache)', () => {
    loadEnrichedCollectionsMock
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

    expect(getCollections().map((c) => c.title)).toEqual(['first'])
    expect(getCollections().map((c) => c.title)).toEqual(['second'])
    expect(loadEnrichedCollectionsMock).toHaveBeenCalledTimes(2)
  })

  it('returns a deep-cloned value so caller mutations do not leak', () => {
    const shared: EnrichedCollection[] = [
      {
        id: 'NS:stable',
        namespace: 'NS',
        name: 'stable',
        title: 'stable',
        description: 'stable',
        properties: [{ name: 'id', type: 'string' }],
      },
    ]
    loadEnrichedCollectionsMock.mockReturnValue(shared)

    const first = getCollections()
    first[0].title = 'mutated by caller'
    first[0].properties.id.type = 'number'

    const second = getCollections()
    expect(second[0].title).toBe('stable')
    expect(second[0].properties.id.type).toBe('string')
  })
})
