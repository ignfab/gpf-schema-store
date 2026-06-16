import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeFeatureType } from '../../../../src/source/wfs/describeFeatureType'

const validResponse = {
  elementFormDefault: 'qualified',
  targetNamespace: 'http://ADMINEXPRESS-COG.2017',
  targetPrefix: 'ADMINEXPRESS-COG.2017',
  featureTypes: [
    {
      typeName: 'departement',
      properties: [
        { name: 'id', maxOccurs: 1, minOccurs: 0, nillable: true, type: 'xsd:string', localType: 'string' },
        { name: 'nom_dep', maxOccurs: 1, minOccurs: 0, nillable: true, type: 'xsd:string', localType: 'string' },
        { name: 'geom', maxOccurs: 1, minOccurs: 0, nillable: true, type: 'gml:MultiPolygon', localType: 'MultiPolygon' },
      ],
    },
  ],
}

function mockFetchJson(body: unknown, status = 200): void {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  )
}

describe('describeFeatureType', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('URL construction', () => {
    it('builds the correct WFS URL with required query parameters', async () => {
      mockFetchJson(validResponse)

      await describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement')

      const calledUrl = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string)
      expect(calledUrl.origin + calledUrl.pathname).toBe('https://example.test/wfs')
      expect(calledUrl.searchParams.get('request')).toBe('DescribeFeatureType')
      expect(calledUrl.searchParams.get('service')).toBe('WFS')
      expect(calledUrl.searchParams.get('version')).toBe('2.0.0')
      expect(calledUrl.searchParams.get('outputFormat')).toBe('application/json')
      expect(calledUrl.searchParams.get('typename')).toBe('ADMINEXPRESS-COG.2017:departement')

    it('preserves existing query parameters on the base URL', async () => {
      mockFetchJson(validResponse)

      await describeFeatureType('https://example.test/wfs?token=abc', 'NS:layer')

      const calledUrl = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string)
      expect(calledUrl.searchParams.get('token')).toBe('abc')
      expect(calledUrl.searchParams.get('request')).toBe('DescribeFeatureType')
    })
  })

  describe('successful response', () => {
    it('returns the parsed FeatureType', async () => {
      mockFetchJson(validResponse)

      const featureType = await describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement')

      expect(featureType.typeName).toBe('departement')
    })

    it('returns a result with the correct properties', async () => {
      mockFetchJson(validResponse)

      const featureType = await describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement')

      expect(featureType.properties).toHaveLength(3)
      expect(featureType.properties[0]).toEqual({
        name: 'id',
        maxOccurs: 1,
        minOccurs: 0,
        nillable: true,
        type: 'xsd:string',
        localType: 'string',
      })
    })
  })

  describe('HTTP errors', () => {
    it('throws on 404 response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response('Not Found', { status: 404, statusText: 'Not Found' }),
      )

      await expect(
        describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement'),
      ).rejects.toThrow('DescribeFeatureType failed for "ADMINEXPRESS-COG.2017:departement": 404 Not Found')
    })

    it('throws on 500 response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
      )

      await expect(
        describeFeatureType('https://example.test/wfs', 'NS:layer'),
      ).rejects.toThrow('DescribeFeatureType failed for "NS:layer": 500 Internal Server Error')
    })
  })

  describe('invalid response shape', () => {
    it('throws on missing featureTypes field', async () => {
      mockFetchJson({ elementFormDefault: 'qualified' })

      await expect(
        describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement'),
      ).rejects.toThrow(/Invalid DescribeFeatureType response for "ADMINEXPRESS-COG.2017:departement"/)
    })

    it('throws on featureTypes being a string instead of an array', async () => {
      mockFetchJson({ elementFormDefault: 'qualified', targetNamespace: 'x', targetPrefix: 'x', featureTypes: 'bad' })

      await expect(
        describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement'),
      ).rejects.toThrow(/featureTypes/)
    })

    it('throws when a property is missing the localType field', async () => {
      const invalid = {
        ...validResponse,
        featureTypes: [
          {
            typeName: 'departement',
            properties: [
              { name: 'id', maxOccurs: 1, minOccurs: 0, nillable: true, type: 'xsd:string' /* localType absent */ },
            ],
          },
        ],
      }
      mockFetchJson(invalid)

      await expect(
        describeFeatureType('https://example.test/wfs', 'ADMINEXPRESS-COG.2017:departement'),
      ).rejects.toThrow(/localType/)
    })
  })
})
