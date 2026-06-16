import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'


const describeFeatureTypeMock = vi.hoisted(() => vi.fn())

/**
 * Mocks for WfsEndpoint methods used by the unit tests.
 */
const endpointMocks = vi.hoisted(() => ({
  isReady: vi.fn(),
  getFeatureTypes: vi.fn(),
  getFeatureTypeSummary: vi.fn(),
  constructor: vi.fn(),
}))

vi.mock('../../../src/source/wfs/describeFeatureType', () => ({
  describeFeatureType: describeFeatureTypeMock,
}))

vi.mock('@camptocamp/ogc-client', () => {
  class WfsEndpoint {
    constructor(url: string) {
      endpointMocks.constructor(url)
    }

    isReady = endpointMocks.isReady
    getFeatureTypes = endpointMocks.getFeatureTypes
    getFeatureTypeSummary = endpointMocks.getFeatureTypeSummary
  }

  return { WfsEndpoint }
})

import { WfsClient } from '../../../src/source/wfs'
import { UnexpectedTypeError } from '../../../src/types'

describe('WfsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    endpointMocks.constructor.mockReset()
    endpointMocks.isReady.mockReset()
    endpointMocks.getFeatureTypes.mockReset()
    endpointMocks.getFeatureTypeSummary.mockReset()
    describeFeatureTypeMock.mockReset()
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
  })

  describe('WfsClient getCollection', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeSummary.mockReturnValue({
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
      describeFeatureTypeMock.mockResolvedValue({
        typeName: 'collection',
        properties: [
          {
            name: 'prop1',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:string',
            localType: 'string',
          },
          {
            name: 'prop2',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:float',
            localType: 'float',
          },
          {
            name: 'geom',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'gml:PolygonPropertyType',
            localType: 'polygon',
          },
        ],
      })
    })

    it('returns the collection with properties from DescribeFeatureType', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const endpointPromise = wfsClient.getWfsEndpoint()
      await vi.runAllTimersAsync()
      await endpointPromise

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
      expect(endpointMocks.getFeatureTypeSummary).toHaveBeenCalledTimes(1)
      expect(endpointMocks.getFeatureTypeSummary).toHaveBeenCalledWith('NS:collection')
      expect(describeFeatureTypeMock).toHaveBeenCalledTimes(1)
      expect(describeFeatureTypeMock).toHaveBeenCalledWith('https://example.test/wfs', 'NS:collection')
    })

    it('retries when describeFeatureType fails once', async () => {
      endpointMocks.getFeatureTypeSummary.mockReturnValue({
        defaultCrs: 'EPSG:4326',
        title: '',
        abstract: '',
      })
      describeFeatureTypeMock
        .mockRejectedValueOnce(new Error('types network'))
        .mockResolvedValueOnce({
          typeName: 'collection',
          properties: [],
        })

      const wfsClient = new WfsClient('https://example.test/wfs')
      const endpointPromise = wfsClient.getWfsEndpoint()
      await vi.runAllTimersAsync()
      await endpointPromise

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
      expect(endpointMocks.constructor).toHaveBeenCalledTimes(1)
      expect(endpointMocks.isReady).toHaveBeenCalledTimes(1)
      expect(endpointMocks.getFeatureTypeSummary).toHaveBeenCalledTimes(1)
      expect(describeFeatureTypeMock).toHaveBeenCalledTimes(2)
      expect(describeFeatureTypeMock).toHaveBeenCalledWith('https://example.test/wfs', 'NS:collection')
    })
  })

  describe('WfsClient getCollection with geometry property type', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeSummary.mockReturnValue({
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
      describeFeatureTypeMock.mockResolvedValue({
        typeName: 'collection',
        properties: [
          {
            name: 'prop1',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:string',
            localType: 'string',
          },
          {
            name: 'prop2',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:float',
            localType: 'float',
          },
          {
            name: 'geom',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'gml:GeometryPropertyType',
            localType: 'geometry',
          },
        ],
      })
    })

    it('returns the collection with geometry default CRS from FeatureType summary', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const endpointPromise = wfsClient.getWfsEndpoint()
      await vi.runAllTimersAsync()
      await endpointPromise

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
    })
  })

  describe('WfsClient getCollection with unexpected property type', () => {
    beforeEach(() => {
      endpointMocks.getFeatureTypeSummary.mockReturnValue({
        defaultCrs: 'EPSG:4326',
        title: 'collection title',
        abstract: 'collection description',
      })
      describeFeatureTypeMock.mockResolvedValue({
        typeName: 'collection',
        properties: [
          {
            name: 'prop1',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:string',
            localType: 'string',
          },
          {
            name: 'prop2',
            maxOccurs: 1,
            minOccurs: 0,
            nillable: true,
            type: 'xsd:base64Binary',
            localType: 'binary',
          },
        ],
      })
    })

    it('throws UnexpectedTypeError when property type is invalid', async () => {
      const wfsClient = new WfsClient('https://example.test/wfs')
      const endpointPromise = wfsClient.getWfsEndpoint()
      await vi.runAllTimersAsync()
      await endpointPromise

      const promise = wfsClient.getCollection('NS:collection')
      const assertion = expect(promise).rejects.toThrow(UnexpectedTypeError)
      await vi.runAllTimersAsync()

      await assertion
    })
  })

})
