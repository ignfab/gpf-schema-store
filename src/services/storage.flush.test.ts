import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Collection } from '../types'

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('fs', () => fsMocks)

describe('clearWfsCollections', () => {
  beforeEach(() => {
    vi.resetModules()
    fsMocks.existsSync.mockReset()
    fsMocks.mkdirSync.mockReset()
    fsMocks.rmSync.mockReset()
    fsMocks.readFileSync.mockReset()
    fsMocks.readdirSync.mockReset()
    fsMocks.writeFileSync.mockReset()

    // resolveDataDir() lookup: src/services/data -> src/data -> data
    fsMocks.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValue(false)
  })

  it('flushes data/wfs before writing a new collection', async () => {
    const { clearWfsCollections, writeWfsCollection } = await import('./storage')

    const collection: Collection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    clearWfsCollections()
    writeWfsCollection(collection)

    expect(fsMocks.rmSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
      { recursive: true, force: true },
    )
    expect(fsMocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]data[\\/]wfs[\\/]NS[\\/]feature\.json$/),
      expect.any(String),
    )

    const clearOrder = fsMocks.rmSync.mock.invocationCallOrder[0]
    const writeOrder = fsMocks.writeFileSync.mock.invocationCallOrder[0]
    expect(clearOrder).toBeLessThan(writeOrder)
  })
})
