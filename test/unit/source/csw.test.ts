import { afterEach, describe, expect, it, vi } from 'vitest'

import { CswClient } from '@/source/csw'
import { buildGetRecordsResponse, ISO_RECORD, textResponse } from './csw/fixtures'

describe('CswClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists all the records with a sorted and paginated GetRecords', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['A', 'B'], { numberOfRecordsMatched: 5, nextRecord: 3 })))
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['C', 'D'], { numberOfRecordsMatched: 5, nextRecord: 5 })))
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['E'], { numberOfRecordsMatched: 5, nextRecord: 0 })))

    const client = new CswClient('https://data.geopf.fr/csw', { pageSize: 2, fetch: fetchMock })
    const records = await client.listRecords()

    expect(records.map((record) => record.fileIdentifier)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const firstUrl = new URL(fetchMock.mock.calls[0][0] as string)
    expect(firstUrl.searchParams.get('request')).toBe('GetRecords')
    expect(firstUrl.searchParams.get('sortBy')).toBe('Identifier:A')
    expect(firstUrl.searchParams.get('startPosition')).toBe('1')
    expect(firstUrl.searchParams.get('maxRecords')).toBe('2')
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get('startPosition')).toBe('3')
    expect(new URL(fetchMock.mock.calls[2][0] as string).searchParams.get('startPosition')).toBe('5')
  })

  it('stops when nextRecord is greater than numberOfRecordsMatched', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['A', 'B'], { numberOfRecordsMatched: 2, nextRecord: 3 })))

    const client = new CswClient('https://data.geopf.fr/csw', { pageSize: 2, fetch: fetchMock })
    await expect(client.listRecords()).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails when fewer records than numberOfRecordsMatched are retrieved', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['A', 'B'], { numberOfRecordsMatched: 4, nextRecord: 3 })))
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['C'], { numberOfRecordsMatched: 4, nextRecord: 0 })))

    const client = new CswClient('https://data.geopf.fr/csw', { pageSize: 2, fetch: fetchMock })
    await expect(client.listRecords()).rejects.toThrow('Incomplete CSW listing: 3 records retrieved, 4 expected')
  })

  it('fails when nextRecord does not move forward', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(textResponse(buildGetRecordsResponse(['A'], { numberOfRecordsMatched: 4, nextRecord: 1 })))

    const client = new CswClient('https://data.geopf.fr/csw', { pageSize: 2, fetch: fetchMock })
    await expect(client.listRecords()).rejects.toThrow('Invalid CSW pagination')
  })

  it('retrieves a record with GetRecordById in ISO 19139', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(textResponse(ISO_RECORD))

    const client = new CswClient('https://data.geopf.fr/csw', { fetch: fetchMock })
    const record = await client.getRecord('IGNF_BD-HAIE')

    expect(record.fileIdentifier).toBe('IGNF_BD-HAIE')
    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.searchParams.get('request')).toBe('GetRecordById')
    expect(url.searchParams.get('id')).toBe('IGNF_BD-HAIE')
    expect(url.searchParams.get('outputSchema')).toBe('http://www.isotc211.org/2005/gmd')
  })

  it('fails when the record is not found', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(textResponse(ISO_RECORD))

    const client = new CswClient('https://data.geopf.fr/csw', { fetch: fetchMock })
    await expect(client.getRecord('UNKNOWN')).rejects.toThrow('CSW record not found: UNKNOWN')
  })

  it('retries on HTTP errors', async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(textResponse('Service Unavailable', 503))
        .mockResolvedValueOnce(textResponse(ISO_RECORD))

      const client = new CswClient('https://data.geopf.fr/csw', { fetch: fetchMock })
      const promise = client.getRecord('IGNF_BD-HAIE')
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toMatchObject({ fileIdentifier: 'IGNF_BD-HAIE' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
