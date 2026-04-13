import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WfsClient } from './wfs'

const originalFetch = globalThis.fetch

const expectedCollections = [
  {
    id: 'NS:collection',
    namespace: 'NS',
    name: 'collection',
    title: 'Collection title',
    description: 'Collection description',
  },
]

const capabilitiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<WFS_Capabilities version="1.0.0">
  <Service>
    <Name>WFS</Name>
    <Title>Test WFS</Title>
    <Abstract>Transient failure test</Abstract>
    <Keywords>test</Keywords>
    <Fees>NONE</Fees>
    <AccessConstraints>NONE</AccessConstraints>
  </Service>
  <Capability>
    <Request>
      <GetCapabilities>
        <DCPType>
          <HTTP>
            <Get onlineResource="https://example.test/wfs"/>
          </HTTP>
        </DCPType>
      </GetCapabilities>
      <DescribeFeatureType>
        <DCPType>
          <HTTP>
            <Get onlineResource="https://example.test/wfs"/>
          </HTTP>
        </DCPType>
      </DescribeFeatureType>
      <GetFeature>
        <ResultFormat>
          <GML2/>
        </ResultFormat>
        <DCPType>
          <HTTP>
            <Get onlineResource="https://example.test/wfs"/>
          </HTTP>
        </DCPType>
      </GetFeature>
    </Request>
  </Capability>
  <FeatureTypeList>
    <FeatureType>
      <Name>NS:collection</Name>
      <Title>Collection title</Title>
      <Abstract>Collection description</Abstract>
      <Keywords>collection</Keywords>
      <SRS>EPSG:4326</SRS>
      <LatLongBoundingBox minx="0" miny="1" maxx="2" maxy="3"/>
    </FeatureType>
  </FeatureTypeList>
</WFS_Capabilities>`

function fetchUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function fetchMethod(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): string {
  return init?.method ?? (input instanceof Request ? input.method : 'GET')
}

describe('WfsClient integration with real ogc-client', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries a transient GetCapabilities failure with a fresh cache-busted WfsEndpoint', async () => {
    let retryEndpointGetCapabilitiesCalls = 0
    const retryEndpointGetCapabilitiesUrls: string[] = []

    globalThis.fetch = vi.fn((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = fetchUrl(input)
      const method = fetchMethod(input, init)

      if (url.includes('REQUEST=GetCapabilities') && method === 'HEAD') {
        return Promise.reject(new Error('temporary network outage'))
      }

      if (url.includes('REQUEST=GetCapabilities') && method === 'GET') {
        if (url.includes('wfs-retry')) {
          retryEndpointGetCapabilitiesCalls += 1
          retryEndpointGetCapabilitiesUrls.push(url)

          if (retryEndpointGetCapabilitiesCalls === 1) {
            return Promise.reject(new Error('temporary network outage'))
          }
        }

        return Promise.resolve(
          new Response(capabilitiesXml, {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          }),
        )
      }

      return Promise.reject(new Error(`unexpected request: ${method} ${url}`))
    }) as unknown as typeof fetch

    const controlRequest = new WfsClient('https://example.test/wfs-ok').getCollections()
    await vi.runAllTimersAsync()
    await expect(controlRequest).resolves.toEqual(expectedCollections)

    const retryingRequest = new WfsClient('https://example.test/wfs-retry').getCollections()
    await vi.runAllTimersAsync()

    try {
      await expect(retryingRequest).resolves.toEqual(expectedCollections)
    } catch (error) {
      throw new Error(
        `Expected a second GetCapabilities GET after the transient failure, got ${retryEndpointGetCapabilitiesCalls}`,
        { cause: error },
      )
    }

    expect(retryEndpointGetCapabilitiesCalls).toBe(2)
    expect(retryEndpointGetCapabilitiesUrls).toHaveLength(2)
    expect(retryEndpointGetCapabilitiesUrls[0]).toContain('_t=')
    expect(retryEndpointGetCapabilitiesUrls[1]).toContain('_t=')
    expect(retryEndpointGetCapabilitiesUrls[1]).not.toBe(retryEndpointGetCapabilitiesUrls[0])
  })
})
