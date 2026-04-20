import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { CollectionOverwrite } from '../types'
import { getOverwrite, loadCollections } from './storage'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data')

describe('loadCollections', () => {
  it('returns the collections from data/wfs JSON files', () => {
    const collections = loadCollections();
    expect(collections).toBeDefined()
    expect(collections.length).toBeGreaterThan(0)

    const ids = collections.map((c) => c.id);
    expect(ids).toContain('BDTOPO_V3:commune');
    expect(ids).toContain('BDTOPO_V3:batiment');
  })
})


describe('getOverwrite', () => {
  it('returns the commune overwrite for BDTOPO_V3:batiment', () => {
    const expectedPath = join(
      DATA_DIR,
      'overwrites',
      'BDTOPO_V3',
      'batiment.json',
    )
    const expected = JSON.parse(readFileSync(expectedPath, 'utf-8')) as CollectionOverwrite
    expect(getOverwrite('BDTOPO_V3', 'batiment')).toEqual(expected)
  })

  it('returns null if the overwrite does not exist', () => {
    expect(getOverwrite('MISSING-NAMESPACE', 'commune')).toBeNull()
  })

})
