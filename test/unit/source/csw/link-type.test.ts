import { describe, expect, it } from 'vitest'

import { getLinkType } from '@/source/csw/link-type'

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
