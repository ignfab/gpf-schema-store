import { DOMParser } from '@xmldom/xmldom';
import xpath from 'xpath';

import type { CswLink, CswRecord, CswRecordBrief } from '../types';
import { getLinkType } from './link-type';

/*
 * =============================================================================
 * XPath Helpers
 * =============================================================================
 */

const select = xpath.useNamespaces({
  csw: 'http://www.opengis.net/cat/csw/2.0.2',
  dc: 'http://purl.org/dc/elements/1.1/',
  ows: 'http://www.opengis.net/ows',
  gmd: 'http://www.isotc211.org/2005/gmd',
  gmi: 'http://www.isotc211.org/2005/gmi',
});

/**
 * Returns the nodes matching an XPath expression.
 */
function findNodes(path: string, node: Node): Node[] {
  const result = select(path, node);
  return xpath.isArrayOfNodes(result) ? result : [];
}

/**
 * Returns the trimmed text values (elements or attributes) matching an XPath expression,
 * ignoring empty values.
 */
function findValues(path: string, node: Node): string[] {
  return findNodes(path, node)
    .map((match) => match.textContent?.trim() ?? '')
    .filter((value) => value.length > 0);
}

/**
 * Returns the first non-empty text value matching an XPath expression.
 */
function findValue(path: string, node: Node): string | undefined {
  return findValues(path, node)[0];
}

function parseXmlDocument(xml: string): Document {
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') {
        throw new Error(`Invalid CSW response: ${message}`);
      }
    },
  }).parseFromString(xml, 'text/xml') as unknown as Document;

  if (findNodes('/ows:ExceptionReport', document).length > 0) {
    const message = findValues('//ows:ExceptionText', document).join('; ');
    throw new Error(`CSW exception: ${message || 'unknown error'}`);
  }
  return document;
}

/*
 * =============================================================================
 * GetRecords parsing (Dublin Core, elementSetName=brief)
 * =============================================================================
 */

export type GetRecordsPage = {
  numberOfRecordsMatched: number;
  nextRecord: number;
  records: CswRecordBrief[];
};

function parseIntegerAttribute(searchResults: Node, name: string): number {
  const value = Number.parseInt(findValue(`./@${name}`, searchResults) ?? '', 10);
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid CSW response: missing or invalid ${name} on SearchResults`);
  }
  return value;
}

function parseBriefRecord(recordElement: Node): CswRecordBrief | undefined {
  const fileIdentifier = findValue('./dc:identifier', recordElement);
  if (!fileIdentifier) {
    return undefined;
  }
  const type = findValue('./dc:type', recordElement);
  return {
    fileIdentifier,
    title: findValue('./dc:title', recordElement) ?? '',
    ...(type ? { type } : {}),
  };
}

/**
 * Parses a GetRecords response (elementSetName=brief, Dublin Core).
 */
export function parseGetRecordsResponse(xml: string): GetRecordsPage {
  const document = parseXmlDocument(xml);
  const searchResults = findNodes('//csw:SearchResults', document)[0];
  if (!searchResults) {
    throw new Error('Invalid CSW response: SearchResults not found');
  }

  return {
    numberOfRecordsMatched: parseIntegerAttribute(searchResults, 'numberOfRecordsMatched'),
    nextRecord: parseIntegerAttribute(searchResults, 'nextRecord'),
    records: findNodes('./*', searchResults)
      .map(parseBriefRecord)
      .filter((record): record is CswRecordBrief => record !== undefined),
  };
}

/*
 * =============================================================================
 * ISO 19115 parsing (ISO 19139 encoding)
 * =============================================================================
 *
 * Elements starting with a capital letter are substitutable (ex : gmd:MD_DataIdentification
 * is matched with "*").
 *
 * @see https://github.com/IGNF/validator/blob/master/validator-core/src/main/java/fr/ign/validator/metadata/gmd/MetadataISO19115.java
 */

function parseFileIdentifier(metadata: Node): string | undefined {
  return findValue('./gmd:fileIdentifier/*', metadata);
}

function parseType(metadata: Node): string | undefined {
  return findValue('./gmd:hierarchyLevel/*/@codeListValue', metadata);
}

function parseTitle(metadata: Node): string | undefined {
  return findValue('./gmd:identificationInfo/*/gmd:citation/*/gmd:title/*', metadata);
}

function parseAbstract(metadata: Node): string | undefined {
  return findValue('./gmd:identificationInfo/*/gmd:abstract/*', metadata);
}

function parseKeywords(metadata: Node): string[] {
  const keywords = findValues('./gmd:identificationInfo/*/gmd:descriptiveKeywords/*/gmd:keyword/*', metadata);
  return [...new Set(keywords)];
}

function parseOnlineResource(onlineResource: Node): CswLink | undefined {
  const url = findValue('./gmd:linkage/gmd:URL', onlineResource);
  if (!url) {
    return undefined;
  }
  const protocol = findValue('./gmd:protocol/*', onlineResource);
  const name = findValue('./gmd:name/*', onlineResource);
  const description = findValue('./gmd:description/*', onlineResource);
  return {
    type: getLinkType(url, protocol),
    url,
    ...(protocol ? { protocol } : {}),
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
  };
}

function parseOnlineResources(metadata: Node): CswLink[] {
  return findNodes('./gmd:distributionInfo/*/gmd:transferOptions/*/gmd:onLine/*', metadata)
    .map(parseOnlineResource)
    .filter((link): link is CswLink => link !== undefined);
}

function parseMetadata(metadata: Node): CswRecord {
  const fileIdentifier = parseFileIdentifier(metadata);
  if (!fileIdentifier) {
    throw new Error('Invalid ISO 19139 record: missing fileIdentifier');
  }
  const type = parseType(metadata);
  const abstract = parseAbstract(metadata);

  // Fields are built in a stable order for the JSON files.
  return {
    fileIdentifier,
    ...(type ? { type } : {}),
    title: parseTitle(metadata) ?? '',
    ...(abstract ? { abstract } : {}),
    keywords: parseKeywords(metadata),
    links: parseOnlineResources(metadata),
  };
}

/**
 * Parses the ISO 19139 records (gmd:MD_Metadata or gmi:MI_Metadata) from a CSW response.
 */
export function parseIsoRecords(xml: string): CswRecord[] {
  const document = parseXmlDocument(xml);
  return findNodes('//gmd:MD_Metadata | //gmi:MI_Metadata', document).map(parseMetadata);
}
