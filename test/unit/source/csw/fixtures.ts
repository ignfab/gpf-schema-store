// CSW responses shared by the CSW unit tests.

export function buildGetRecordsResponse(
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

export const ISO_RECORD = `<?xml version="1.0" encoding="UTF-8"?>
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
        <gmd:descriptiveKeywords>
          <gmd:MD_Keywords>
            <gmd:keyword>
              <gmx:Anchor xlink:href="http://inspire.ec.europa.eu/metadata-codelist/SpatialScope/national" xmlns:xlink="http://www.w3.org/1999/xlink">National</gmx:Anchor>
            </gmd:keyword>
            <gmd:thesaurusName>
              <gmd:CI_Citation>
                <gmd:title>
                  <gmx:Anchor xlink:href="http://inspire.ec.europa.eu/metadata-codelist/SpatialScope" xmlns:xlink="http://www.w3.org/1999/xlink">INSPIRE Spatial Scope</gmx:Anchor>
                </gmd:title>
              </gmd:CI_Citation>
            </gmd:thesaurusName>
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

export function textResponse(body: string, status = 200): Response {
  return new Response(body, { status })
}
