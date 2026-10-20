import { describe, expect, it } from 'vitest'

import { parseGetRecordsResponse, parseIsoRecords } from '@/source/csw/parser'
import { buildGetRecordsResponse, ISO_RECORD } from './fixtures'

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
