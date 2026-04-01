import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { getCollections } from './wfs'

describe('getCollections retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    endpointMocks.isReady.mockReset()
    endpointMocks.getFeatureTypes.mockReset()
    endpointMocks.getFeatureTypeFull.mockReset()
    endpointMocks.isReady.mockResolvedValue(undefined)
    endpointMocks.getFeatureTypes.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries isReady and succeeds', async () => {
    endpointMocks.isReady
      .mockRejectedValueOnce(new Error('boot network'))
      .mockResolvedValueOnce(undefined)

    const promise = getCollections('https://example.test/wfs')
    const assertion = expect(promise).resolves.toEqual([])
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.isReady).toHaveBeenCalledTimes(2)
  })

  it('retries getFeatureTypes and succeeds', async () => {
    endpointMocks.getFeatureTypes
      .mockRejectedValueOnce(new Error('types network'))
      .mockResolvedValueOnce([])

    const promise = getCollections('https://example.test/wfs')
    const assertion = expect(promise).resolves.toEqual([])
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.getFeatureTypes).toHaveBeenCalledTimes(2)
  })

  it('fails fast when getFeatureTypeFull still fails after retries', async () => {
    endpointMocks.getFeatureTypes.mockResolvedValue([
      { name: 'BDTOPO_V3:batiment', title: 'batiment', abstract: '' },
      { name: 'BDTOPO_V3:commune', title: 'commune', abstract: '' },
    ])
    endpointMocks.getFeatureTypeFull.mockRejectedValue(new Error('describe failed'))

    const promise = getCollections('https://example.test/wfs')
    const assertion = expect(promise).rejects.toThrow('describe failed')
    await vi.runAllTimersAsync()

    await assertion
    expect(endpointMocks.getFeatureTypeFull).toHaveBeenCalledTimes(3)
    expect(endpointMocks.getFeatureTypeFull.mock.calls.map(([name]) => name)).toEqual([
      'BDTOPO_V3:batiment',
      'BDTOPO_V3:batiment',
      'BDTOPO_V3:batiment',
    ])
  })
})
