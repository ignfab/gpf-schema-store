import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mocks for the WfsEndpoint methods.
 */
const endpointMocks = {
  isReady: vi.fn(),
  getFeatureTypes: vi.fn(),
  getFeatureTypeFull: vi.fn(),
}

vi.mock('@camptocamp/ogc-client', () => {
  class WfsEndpoint {
    constructor(_url: string) {}

    isReady = endpointMocks.isReady
    getFeatureTypes = endpointMocks.getFeatureTypes
    getFeatureTypeFull = endpointMocks.getFeatureTypeFull
  }

  return { WfsEndpoint }
})

import { WfsClient } from './wfs'


describe('WfsClient getCollections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    endpointMocks.isReady.mockReset()
    endpointMocks.getFeatureTypes.mockReset()
    endpointMocks.getFeatureTypeFull.mockReset()
    endpointMocks.isReady.mockResolvedValue(undefined)
    endpointMocks.getFeatureTypes.mockResolvedValue([])
  });

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  });

  it('returns the collections from the WFS endpoint', async () => {
    endpointMocks.getFeatureTypes.mockResolvedValue([
      { name: 'BDTOPO_V3:batiment', title: 'batiment', abstract: '' },
      { name: 'BDTOPO_V3:commune', title: 'commune', abstract: '' },
    ])

    const wfsClient = new WfsClient('https://example.test/wfs');
    const promise = wfsClient.getCollections();
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
    expect(endpointMocks.isReady).toHaveBeenCalledTimes(1)
    expect(endpointMocks.getFeatureTypes).toHaveBeenCalledTimes(1)
  });

  it('should retry isReady and getFeatureTypes when they fail', async () => {
    endpointMocks.isReady
      .mockRejectedValueOnce(new Error('boot network'))
      .mockResolvedValueOnce(undefined)

    endpointMocks.getFeatureTypes
      .mockRejectedValueOnce(new Error('types network'))
      .mockResolvedValueOnce([])

    const wfsClient = new WfsClient('https://example.test/wfs');
    const promise = wfsClient.getCollections();
    const assertion = expect(promise).resolves.toEqual([])
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.isReady).toHaveBeenCalledTimes(2)
    expect(endpointMocks.getFeatureTypes).toHaveBeenCalledTimes(2)
  });

});

describe('WfsClient getCollection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    endpointMocks.isReady.mockReset()
    endpointMocks.getFeatureTypes.mockReset()
    endpointMocks.getFeatureTypeFull.mockReset()
    endpointMocks.isReady.mockResolvedValue(undefined)
    endpointMocks.getFeatureTypeFull.mockResolvedValue({
      properties: {
        prop1: 'string',
        prop2: 'number',
      },
      geometryName: 'geom',
      geometryType: 'Polygon',
      defaultCrs: 'EPSG:4326',
      title: 'collection title',
      abstract: 'collection description',
    })
  });

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  });

  it('returns the collection with its properties from the WFS endpoint', async () => {
    const wfsClient = new WfsClient('https://example.test/wfs');
    const promise = wfsClient.getCollection('NS:collection');
    const assertion = expect(promise).resolves.toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'collection title',
      description: 'collection description',
      properties: [
        { name: 'prop1', type: 'string' },
        { name: 'prop2', type: 'number' },
        { name: 'geom', type: 'Polygon', defaultCrs: 'EPSG:4326' }
      ]
    });
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.isReady).toHaveBeenCalledTimes(1)
    expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledTimes(1)
    expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledWith('NS:collection')
  });

  it('should retry isReady and getFeatureTypeFull when they fail', async () => {
    endpointMocks.isReady
      .mockRejectedValueOnce(new Error('boot network'))
      .mockResolvedValueOnce(undefined)

    endpointMocks.getFeatureTypeFull
      .mockRejectedValueOnce(new Error('types network'))
      .mockResolvedValueOnce({
        properties: {},
        title: '',
        abstract: '',
      })

    const wfsClient = new WfsClient('https://example.test/wfs');
    const promise = wfsClient.getCollection('NS:collection');
    const assertion = expect(promise).resolves.toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: '',
      description: '',
      properties: []
    });
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.isReady).toHaveBeenCalledTimes(2)
    expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledTimes(2)
    expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledWith('NS:collection')
  });

});

