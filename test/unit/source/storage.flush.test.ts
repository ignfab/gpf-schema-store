import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceCollection } from '../../../src/types'

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  rmSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('fs', () => fsMocks)

describe('loadSourceCollections', () => {
  beforeEach(() => {
    vi.resetModules()
    fsMocks.existsSync.mockReset()
    fsMocks.mkdirSync.mockReset()
    fsMocks.renameSync.mockReset()
    fsMocks.rmSync.mockReset()
    fsMocks.readFileSync.mockReset()
    fsMocks.readdirSync.mockReset()
    fsMocks.writeFileSync.mockReset()

    // resolveDataDir() lookup: src/services/data -> src/data -> data
    fsMocks.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
  })

  it('rejects invalid source collection snapshots', async () => {
    const { loadSourceCollections } = await import('../../../src/source/source-store')

    fsMocks.existsSync.mockReturnValueOnce(true)
    fsMocks.readdirSync
      .mockReturnValueOnce([{ name: 'NS', isDirectory: () => true }] as never)
      .mockReturnValueOnce(['feature.json'] as never)
    fsMocks.readFileSync.mockReturnValueOnce(JSON.stringify({
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'binary' }],
    }))

    expect(() => loadSourceCollections()).toThrow(
      /Invalid source collection .*feature\.json: properties\.0\.type/,
    )
  })

  it('parses valid source collection snapshots', async () => {
    const { loadSourceCollections } = await import('../../../src/source/source-store')

    fsMocks.existsSync.mockReturnValueOnce(true)
    fsMocks.readdirSync
      .mockReturnValueOnce([{ name: 'NS', isDirectory: () => true }] as never)
      .mockReturnValueOnce(['feature.json'] as never)
    fsMocks.readFileSync.mockReturnValueOnce(JSON.stringify({
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'geom', type: 'polygon', defaultCrs: 'EPSG:4326' }],
    }))

    const collections = loadSourceCollections()
    expect(collections).toHaveLength(1)
    expect(collections[0]).toMatchObject({
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      properties: [{ name: 'geom', type: 'polygon', defaultCrs: 'EPSG:4326' }],
    })
  })
})

describe('clearWfsCollections', () => {
  beforeEach(() => {
    vi.resetModules()
    fsMocks.existsSync.mockReset()
    fsMocks.mkdirSync.mockReset()
    fsMocks.renameSync.mockReset()
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
    const { clearSourceCollections, writeSourceCollection } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    clearSourceCollections()
    writeSourceCollection(collection)

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

describe('replaceWfsCollections', () => {
  beforeEach(() => {
    vi.resetModules()
    fsMocks.existsSync.mockReset()
    fsMocks.mkdirSync.mockReset()
    fsMocks.renameSync.mockReset()
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

  it('refuses to replace data/wfs with an empty snapshot', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    fsMocks.existsSync.mockClear()
    fsMocks.mkdirSync.mockClear()
    fsMocks.renameSync.mockClear()
    fsMocks.rmSync.mockClear()
    fsMocks.writeFileSync.mockClear()

    expect(() => replaceSourceCollections([])).toThrow(
      'Refusing to replace data/wfs with an empty collection snapshot',
    )
    expect(fsMocks.existsSync).not.toHaveBeenCalled()
    expect(fsMocks.mkdirSync).not.toHaveBeenCalled()
    expect(fsMocks.renameSync).not.toHaveBeenCalled()
    expect(fsMocks.rmSync).not.toHaveBeenCalled()
    expect(fsMocks.writeFileSync).not.toHaveBeenCalled()
  })

  it('writes the replacement snapshot before moving the existing data/wfs directory', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    // recovery sees current data/wfs, namespace directory does not exist in
    // nextRoot, current data/wfs exists before promotion.
    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    replaceSourceCollections([collection])

    expect(fsMocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]data[\\/]\.wfs-next-[^\\/]+[\\/]NS[\\/]feature\.json$/),
      expect.any(String),
    )
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
      expect.stringMatching(/[\\/]data[\\/]\.wfs-previous$/),
    )
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-next-[^\\/]+$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )

    const writeOrder = fsMocks.writeFileSync.mock.invocationCallOrder[0]
    const firstRenameOrder = fsMocks.renameSync.mock.invocationCallOrder[0]
    expect(writeOrder).toBeLessThan(firstRenameOrder)
    expect(fsMocks.rmSync).not.toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
      expect.anything(),
    )
  })

  it('does not move the existing data/wfs directory when writing the replacement fails', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    fsMocks.writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full')
    })

    expect(() => replaceSourceCollections([collection])).toThrow('disk full')
    expect(fsMocks.renameSync).not.toHaveBeenCalled()
  })

  it('restores the previous snapshot when promoting the replacement fails', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    // recovery sees current data/wfs, namespace directory does not exist in
    // nextRoot, current data/wfs exists before promotion.
    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    fsMocks.renameSync
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('rename failed')
      })
      .mockImplementationOnce(() => undefined)

    expect(() => replaceSourceCollections([collection])).toThrow('rename failed')
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-previous$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )
  })

  it('reports both promotion and restore failures when rollback fails', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    // recovery sees current data/wfs, namespace directory does not exist in
    // nextRoot, current data/wfs exists before promotion.
    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    fsMocks.renameSync
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('promotion failed')
      })
      .mockImplementationOnce(() => {
        throw new Error('restore failed')
      })

    expect(() => replaceSourceCollections([collection])).toThrow(
      /Failed to promote .* and failed to restore previous snapshot .*restore failed/,
    )
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-previous$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )
  })

  it('preserves the original failure when temporary snapshot cleanup fails', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    fsMocks.writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    fsMocks.rmSync
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('cleanup failed')
      })

    expect(() => replaceSourceCollections([collection])).toThrow('disk full')
  })

  it('does not fail the update when previous snapshot cleanup fails after promotion', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    // recovery sees current data/wfs, namespace directory does not exist in
    // nextRoot, current data/wfs exists before promotion.
    fsMocks.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    fsMocks.rmSync
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('cleanup failed')
      })

    expect(() => replaceSourceCollections([collection])).not.toThrow()
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-next-[^\\/]+$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )
  })

  it('restores an interrupted previous snapshot before writing a new replacement', async () => {
    const { replaceSourceCollections } = await import('../../../src/source/source-store')

    const collection: SourceCollection = {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    }

    // recovery sees missing data/wfs and existing .wfs-previous, then the new
    // replacement writes normally.
    fsMocks.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    replaceSourceCollections([collection])

    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-previous$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
      expect.stringMatching(/[\\/]data[\\/]\.wfs-previous$/),
    )
    expect(fsMocks.renameSync).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/[\\/]data[\\/]\.wfs-next-[^\\/]+$/),
      expect.stringMatching(/[\\/]data[\\/]wfs$/),
    )
  })
})
