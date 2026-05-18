import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UnexpectedTypeError } from '../../../src/types'

/**
 * Mocks for WfsEndpoint methods used by the unit tests.
 */
const endpointMocks = vi.hoisted(() => ({
  isReady: vi.fn(),
  getFeatureTypes: vi.fn(),
  getFeatureTypeFull: vi.fn(),
  constructor: vi.fn(),
}))

vi.mock('@camptocamp/ogc-client', () => {
  class WfsEndpoint {
    constructor(url: string) {
      endpointMocks.constructor(url)
    }

    isReady = endpointMocks.isReady
    getFeatureTypes = endpointMocks.getFeatureTypes
    getFeatureTypeFull = endpointMocks.getFeatureTypeFull
  }

  return { WfsEndpoint }
})

import { WfsClient } from '../../../src/services/wfs'

describe('WfsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    endpointMocks.constructor.mockReset()
    endpointMocks.isReady.mockReset()
    endpointMocks.getFeatureTypes.mockReset()
    endpointMocks.getFeatureTypeFull.mockReset()
    endpointMocks.isReady.mockResolvedValue(undefined)
    endpointMocks.getFeatureTypes.mockReturnValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('WfsClient getWfsEndpoint', () => {
    it('retries WfsEndpoint creation when isReady fails once', async () => {
      endpointMocks.isReady
        .mockRejectedValueOnce(new Error('boot network'))
        .mockResolvedValueOnce(undefined)

      const wfsClient = new WfsClient('https://example.test/wfs')
      const endpoint = wfsClient.getWfsEndpoint()
      const assertion = expect(endpoint).resolves.toBeDefined()
      await vi.runAllTimersAsync()

      await assertion
      // First isReady failure triggers a second endpoint construction on retry.
      expect(endpointMocks.constructor).toHaveBeenCalledTimes(2)
      expect(endpointMocks.constructor.mock.calls.map(([url]) => url)).toEqual([
        'https://example.test/wfs?_t=1704067200000',
        'https://example.test/wfs?_t=1704067201000',
      ])
      expect(endpointMocks.isReady).toHaveBeenCalledTimes(2)
    })
  })

  describe('WfsClient getCollections', () => {
    it('returns collections mapped from the WFS endpoint', async () => {
      endpointMocks.getFeatureTypes.mockReturnValue([
        { name: 'BDTOPO_V3:batiment', title: 'batiment', abstract: '' },
        { name: 'BDTOPO_V3:commune', title: 'commune', abstract: '' },
      ])

      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollections()
      const assertion = expect(promise).resolves.toEqual([
        {
          id: 'BDTOPO_V3:batiment',
          namespace: 'BDTOPO_V3',
          name: 'batiment',
          title: 'batiment',
          description: '',
        },
        {
          id: 'BDTOPO_V3:commune',
          namespace: 'BDTOPO_V3',
          name: 'commune',
          title: 'commune',
          description: '',
        },
      ])
      await vi.runAllTimersAsync()

      await assertion
      expect(endpointMocks.constructor).toHaveBeenCalledTimes(1)
      expect(endpointMocks.constructor).toHaveBeenCalledWith('https://example.test/wfs?_t=1704067200000')
      expect(endpointMocks.isReady).toHaveBeenCalledTimes(1)
      expect(endpointMocks.getFeatureTypes).toHaveBeenCalledTimes(1)
    })

    it('rejects invalid feature type payloads from the WFS endpoint', async () => {
      endpointMocks.getFeatureTypes.mockReturnValue([
        { title: 'batiment', abstract: '' },
      ])

      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollections()
      const assertion = expect(promise).rejects.toThrow(
        /Invalid WFS GetCapabilities payload: 0\.name/,
      )
      await vi.runAllTimersAsync()

      await assertion
    })
  })

  describe('WfsClient getCollection', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeFull.mockResolvedValue({
        properties: {
          prop1: 'string',
          prop2: 'float',
        },
        geometryName: 'geom',
        geometryType: 'polygon',
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
    })

    it('returns the collection with properties from the WFS endpoint', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).resolves.toEqual({
        id: 'NS:collection',
        namespace: 'NS',
        name: 'collection',
        title: 'collection title',
        description: 'collection description',
        properties: [
          { name: 'prop1', type: 'string' },
          { name: 'prop2', type: 'float' },
          { name: 'geom', type: 'polygon', defaultCrs: 'EPSG:4326' },
        ],
      })
      await vi.runAllTimersAsync()

      await assertion
      expect(endpointMocks.constructor).toHaveBeenCalledTimes(1)
      expect(endpointMocks.constructor).toHaveBeenCalledWith('https://example.test/wfs?_t=1704067200000')
      expect(endpointMocks.isReady).toHaveBeenCalledTimes(1)
      expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledTimes(1)
      expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledWith('NS:collection')
    })

    it('retries when getFeatureTypeFull fails once', async () => {
      endpointMocks.getFeatureTypeFull
        .mockRejectedValueOnce(new Error('types network'))
        .mockResolvedValueOnce({
          properties: {},
          title: '',
          abstract: '',
        })

      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).resolves.toEqual({
        id: 'NS:collection',
        namespace: 'NS',
        name: 'collection',
        title: '',
        description: '',
        properties: [],
      })
      await vi.runAllTimersAsync()

      await assertion
      // First getFeatureTypeFull failure builds a fresh cache-busted endpoint.
      expect(endpointMocks.constructor).toHaveBeenCalledTimes(2)
      expect(endpointMocks.constructor.mock.calls.map(([url]) => url)).toEqual([
        'https://example.test/wfs?_t=1704067200000',
        'https://example.test/wfs?_t=1704067201000',
      ])
      expect(endpointMocks.isReady).toHaveBeenCalledTimes(2)
      expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledTimes(2)
      expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledWith('NS:collection')
    })

    it('rejects invalid feature type details from the WFS endpoint', async () => {
      endpointMocks.getFeatureTypeFull.mockResolvedValue({
        title: 'collection title',
        abstract: 'collection description',
      })

      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).rejects.toThrow(
        /Invalid WFS DescribeFeatureType payload for "NS:collection": properties/,
      )
      await vi.runAllTimersAsync()

      await assertion
    })
  })
  


  describe('WfsClient getCollection with unknown geometry type', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeFull.mockResolvedValue({
        properties: {
          prop1: 'string',
          prop2: 'float',
        },
        geometryName: 'geom',
        geometryType: 'unknown',
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
    })

    it('returns the collection with geometry type set to "geometry" when geometryType is "unknown"', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).resolves.toEqual({
        id: 'NS:collection',
        namespace: 'NS',
        name: 'collection',
        title: 'collection title',
        description: 'collection description',
        properties: [
          { name: 'prop1', type: 'string' },
          { name: 'prop2', type: 'float' },
          { name: 'geom', type: 'geometry', defaultCrs: 'EPSG:4326' },
        ],
      })
      await vi.runAllTimersAsync()

      await assertion
    });

  })

  describe('WfsClient getCollection with empty default CRS', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeFull.mockResolvedValue({
        properties: {
          prop1: 'string',
        },
        geometryName: 'geom',
        geometryType: 'polygon',
        defaultCrs: '',
        title: 'collection title',
        abstract: 'collection description',
      })
    })

    it('rejects empty defaultCrs values from the WFS endpoint', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).rejects.toThrow(
        /Invalid WFS DescribeFeatureType payload for "NS:collection": defaultCrs/,
      )
      await vi.runAllTimersAsync()

      await assertion
    })
  })

  describe('WfsClient getCollection with unexpected property type', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeFull.mockResolvedValue({
        properties: {
          prop1: 'string',
          prop2: 'binary',
        },
        geometryName: 'geom',
        geometryType: 'polygon',
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
    })

    it('throws UnexpectedTypeError when property type is invalid', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).rejects.toThrow(UnexpectedTypeError)
      await vi.runAllTimersAsync()

      await assertion
    })
  })

})
