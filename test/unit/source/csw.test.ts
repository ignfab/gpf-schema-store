import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CswClient,
  getLinkType,
  parseGetRecordsResponse,
  parseIsoRecords,
} from '@/source/csw'

/*
 * =============================================================================
 * Fixtures
 * =============================================================================
 */

function buildGetRecordsResponse(
  identifiers: string[],
  options: { numberOfRecordsMatched: number; nextRecord: number },
): string {
  const records = identifiers.map((identifier) => `
    <csw:BriefRecord xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:identifier>${identifier}</dc:identifier>
      <dc:title>Title of ${identifier}</dc:title>
      <dc:type>dataset</dc:type>
    </csw:BriefRecord>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecordsResponse xmlns:csw="http://www.opengis.net/cat/csw/2.0.2">
  <csw:SearchStatus timestamp="2026-10-20T10:02:29.871216Z" />
  <csw:SearchResults numberOfRecordsMatched="${options.numberOfRecordsMatched}" numberOfRecordsReturned="${identifiers.length}" elementSet="brief" nextRecord="${options.nextRecord}">${records}
  </csw:SearchResults>
</csw:GetRecordsResponse>`
}

const ISO_RECORD = `<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecordByIdResponse xmlns:csw="http://www.opengis.net/cat/csw/2.0.2">
  <gmd:MD_Metadata xmlns:gmd="http://www.isotc211.org/2005/gmd" xmlns:gco="http://www.isotc211.org/2005/gco" xmlns:gmx="http://www.isotc211.org/2005/gmx">
    <gmd:fileIdentifier>
      <gco:CharacterString>IGNF_BD-HAIE</gco:CharacterString>
    </gmd:fileIdentifier>
    <gmd:hierarchyLevel>
      <gmd:MD_ScopeCode codeList="http://standards.iso.org/iso/19139/resources/gmxCodelists.xml#MD_ScopeCode" codeListValue="series" />
    </gmd:hierarchyLevel>
    <gmd:identificationInfo>
      <gmd:MD_DataIdentification>
        <gmd:citation>
          <gmd:CI_Citation>
            <gmd:title>
              <gco:CharacterString>BD HAIE</gco:CharacterString>
            </gmd:title>
          </gmd:CI_Citation>
        </gmd:citation>
        <gmd:abstract>
          <gco:CharacterString>  La BD Haie est une couche nationale de référence des haies linéaires.  </gco:CharacterString>
        </gmd:abstract>
        <gmd:descriptiveKeywords>
          <gmd:MD_Keywords>
            <gmd:keyword>
              <gco:CharacterString>haies</gco:CharacterString>
              <!-- comment ignored -->
            </gmd:keyword>
            <gmd:keyword>
              <gmx:Anchor xlink:href="http://example.org/bocages" xmlns:xlink="http://www.w3.org/1999/xlink">bocages</gmx:Anchor>
            </gmd:keyword>
            <gmd:keyword>
              <gco:CharacterString>haies</gco:CharacterString>
            </gmd:keyword>
          </gmd:MD_Keywords>
        </gmd:descriptiveKeywords>
      </gmd:MD_DataIdentification>
    </gmd:identificationInfo>
    <gmd:distributionInfo>
      <gmd:MD_Distribution>
        <gmd:transferOptions>
          <gmd:MD_DigitalTransferOptions>
            <gmd:onLine>
              <gmd:CI_OnlineResource>
                <gmd:linkage>
                  <gmd:URL>https://data.geopf.fr/wfs/ows?SERVICE=WFS&amp;VERSION=2.0.0&amp;REQUEST=GetCapabilities</gmd:URL>
                </gmd:linkage>
                <gmd:protocol>
                  <gmx:MimeFileType type="">OGC:WFS</gmx:MimeFileType>
                </gmd:protocol>
                <gmd:name>
                  <gco:CharacterString>BDTOPO_V3:haie</gco:CharacterString>
                </gmd:name>
                <gmd:description>
                  <gco:CharacterString>BD TOPO® V3 haie</gco:CharacterString>
                </gmd:description>
              </gmd:CI_OnlineResource>
            </gmd:onLine>
            <gmd:onLine>
              <gmd:CI_OnlineResource>
                <gmd:linkage>
                  <gmd:URL>https://data.geopf.fr/annexes/ressources/documentation/DSB_v2.pdf</gmd:URL>
                </gmd:linkage>
                <gmd:name>
                  <gco:CharacterString>DSB - Descriptif de contenu v2</gco:CharacterString>
                </gmd:name>
                <gmd:description gco:nilReason="missing">
                  <gco:CharacterString />
                </gmd:description>
              </gmd:CI_OnlineResource>
            </gmd:onLine>
            <gmd:onLine>
              <gmd:CI_OnlineResource>
                <gmd:linkage>
                  <gmd:URL />
                </gmd:linkage>
              </gmd:CI_OnlineResource>
            </gmd:onLine>
          </gmd:MD_DigitalTransferOptions>
        </gmd:transferOptions>
      </gmd:MD_Distribution>
    </gmd:distributionInfo>
  </gmd:MD_Metadata>
</csw:GetRecordByIdResponse>`

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status })
}

/*
 * =============================================================================
 * Tests
 * =============================================================================
 */

describe('getLinkType', () => {
  it('detects capabilities documents from the URL path first', () => {
    expect(getLinkType('https://example.org/wms/capabilities.xml', 'OGC:WMS')).toBe('capabilities')
  })

  it('uses the protocol when known (case-insensitive)', () => {
    expect(getLinkType('https://example.org/ows', 'OGC:WFS')).toBe('wfs')
    expect(getLinkType('https://example.org/ows', 'ogc web feature service')).toBe('wfs')
    expect(getLinkType('https://example.org/ows', 'OGC Web Map Service')).toBe('wms')
    expect(getLinkType('https://example.org/ows', 'OGC:WMTS')).toBe('wmts')
    expect(getLinkType('https://example.org/ows', 'TMS')).toBe('tms')
    expect(getLinkType('https://example.org/file', 'WWW:DOWNLOAD-1.0-http--download')).toBe('download')
    expect(getLinkType('https://example.org/page', 'WWW:LINK-1.0-http--link')).toBe('documentation')
  })

  it('falls back on the URL path segments', () => {
    expect(getLinkType('https://data.geopf.fr/wfs/ows?SERVICE=WFS')).toBe('wfs')
    expect(getLinkType('https://data.geopf.fr/wms-v/ows')).toBe('wms')
    expect(getLinkType('https://data.geopf.fr/wms-r')).toBe('wms')
    expect(getLinkType('https://data.geopf.fr/wmts?SERVICE=WMTS')).toBe('wmts')
    expect(getLinkType('https://data.geopf.fr/tms/1.0.0/')).toBe('tms')
    expect(getLinkType('https://data.geopf.fr/telechargement/resource/BD-HAIE')).toBe('download')
  })

  it('falls back on the file extension', () => {
    expect(getLinkType('https://example.org/doc/DSB.PDF')).toBe('documentation')
    expect(getLinkType('https://example.org/index.html')).toBe('documentation')
    expect(getLinkType('https://example.org/data/archive.7z')).toBe('download')
    expect(getLinkType('https://example.org/data/file.gpkg?x=1')).toBe('download')
  })

  it('ignores unknown protocols', () => {
    expect(getLinkType('https://example.org/doc.pdf', 'application:pdf')).toBe('documentation')
  })

  it('returns other when nothing matches', () => {
    expect(getLinkType('https://example.org/')).toBe('other')
    expect(getLinkType('not a url')).toBe('other')
  })
})

describe('parseGetRecordsResponse', () => {
  it('parses the brief records and the pagination attributes', () => {
    const page = parseGetRecordsResponse(
      buildGetRecordsResponse(['A', 'B'], { numberOfRecordsMatched: 5, nextRecord: 3 }),
    )
    expect(page).toEqual({
      numberOfRecordsMatched: 5,
      nextRecord: 3,
      records: [
        { fileIdentifier: 'A', title: 'Title of A', type: 'dataset' },
        { fileIdentifier: 'B', title: 'Title of B', type: 'dataset' },
      ],
    })
  })

  it('throws on CSW exceptions', () => {
    const xml = `<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows">
      <ows:Exception exceptionCode="InvalidParameterValue">
        <ows:ExceptionText>Bad sortBy</ows:ExceptionText>
      </ows:Exception>
    </ows:ExceptionReport>`
    expect(() => parseGetRecordsResponse(xml)).toThrow('CSW exception: Bad sortBy')
  })

  it('throws when SearchResults is missing', () => {
    expect(() => parseGetRecordsResponse('<root />')).toThrow('SearchResults not found')
  })
})

describe('parseIsoRecords', () => {
  it('parses the ISO 19139 record into the pivot model', () => {
    expect(parseIsoRecords(ISO_RECORD)).toEqual([
      {
        fileIdentifier: 'IGNF_BD-HAIE',
        type: 'series',
        title: 'BD HAIE',
        abstract: 'La BD Haie est une couche nationale de référence des haies linéaires.',
        keywords: ['haies', 'bocages'],
        links: [
          {
            type: 'wfs',
            url: 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities',
            protocol: 'OGC:WFS',
            name: 'BDTOPO_V3:haie',
            description: 'BD TOPO® V3 haie',
          },
          {
            type: 'documentation',
            url: 'https://data.geopf.fr/annexes/ressources/documentation/DSB_v2.pdf',
            name: 'DSB - Descriptif de contenu v2',
          },
        ],
      },
    ])
  })

  it('returns an empty list when the response has no record', () => {
    expect(parseIsoRecords('<csw:GetRecordByIdResponse xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" />')).toEqual([])
  })

  it('throws when fileIdentifier is missing', () => {
    const xml = '<gmd:MD_Metadata xmlns:gmd="http://www.isotc211.org/2005/gmd" />'
    expect(() => parseIsoRecords(xml)).toThrow('missing fileIdentifier')
  })
})

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
