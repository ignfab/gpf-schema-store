import { debuglog } from 'node:util';
import { parseXml, XmlElement } from '@rgrove/parse-xml';

import { retry } from '@/helpers/retry';
import type { CswLink, CswLinkType, CswRecord, CswRecordBrief } from './types';

const debug = debuglog('gpf-schema-store:csw');

/*
 * =============================================================================
 * CSW Request Settings
 * =============================================================================
 */

const ISO_19139_OUTPUT_SCHEMA = 'http://www.isotc211.org/2005/gmd';
const DEFAULT_PAGE_SIZE = 50;

export type CswClientOptions = {
  /**
   * Number of records per GetRecords page.
   */
  pageSize?: number;
  /**
   * fetch implementation (allows mocking in tests).
   */
  fetch?: typeof fetch;
};

/*
 * =============================================================================
 * XML Helpers
 * =============================================================================
 *
 * Namespace prefixes are ignored : elements are matched on their local names.
 */

function localName(name: string): string {
  const index = name.indexOf(':');
  return index === -1 ? name : name.slice(index + 1);
}

function childElements(element: XmlElement, name = '*'): XmlElement[] {
  return element.children.filter(
    (child): child is XmlElement =>
      child instanceof XmlElement && (name === '*' || localName(child.name) === name),
  );
}

/**
 * Returns the elements matching a path of local names (`*` matches any element).
 */
function findElements(element: XmlElement, ...path: string[]): XmlElement[] {
  let current = [element];
  for (const name of path) {
    current = current.flatMap((candidate) => childElements(candidate, name));
  }
  return current;
}

function findText(element: XmlElement, ...path: string[]): string | undefined {
  return findTexts(element, ...path)[0];
}

function findTexts(element: XmlElement, ...path: string[]): string[] {
  return findElements(element, ...path)
    .map((candidate) => candidate.text.trim())
    .filter((text) => text.length > 0);
}

function findDescendants(element: XmlElement, names: string[]): XmlElement[] {
  const results: XmlElement[] = [];
  for (const child of childElements(element)) {
    if (names.includes(localName(child.name))) {
      results.push(child);
    } else {
      results.push(...findDescendants(child, names));
    }
  }
  return results;
}

function parseXmlRoot(xml: string): XmlElement {
  const root = parseXml(xml).root;
  if (!root) {
    throw new Error('Invalid CSW response: no root element');
  }
  if (localName(root.name) === 'ExceptionReport') {
    const message = findDescendants(root, ['ExceptionText']).map((e) => e.text.trim()).join('; ');
    throw new Error(`CSW exception: ${message || 'unknown error'}`);
  }
  return root;
}

/*
 * =============================================================================
 * Link typing
 * =============================================================================
 *
 * Adapted from https://github.com/mborne/gpf-catalogue : the protocol is used
 * when known, otherwise the URL path segments, otherwise the file extension.
 */

const LINK_TYPES_BY_PROTOCOL: Record<string, CswLinkType> = {
  'ogc:wms': 'wms',
  'ogc web map service': 'wms',
  'ogc:wfs': 'wfs',
  'ogc web feature service': 'wfs',
  'ogc:wmts': 'wmts',
  'ogc:tms': 'tms',
  'tms': 'tms',
  'www:download-1.0-http--download': 'download',
  'www:link-1.0-http--link': 'documentation',
};

const LINK_TYPES_BY_PATH_SEGMENT: Record<string, CswLinkType> = {
  'wfs': 'wfs',
  'wms': 'wms',
  'wms-v': 'wms',
  'wms-r': 'wms',
  'wmts': 'wmts',
  'tms': 'tms',
  'telechargement': 'download',
};

const LINK_TYPES_BY_EXTENSION: Record<string, CswLinkType> = {
  '.pdf': 'documentation',
  '.html': 'documentation',
  '.htm': 'documentation',
  '.txt': 'documentation',
  '.md': 'documentation',
  '.odt': 'documentation',
  '.docx': 'documentation',
  '.zip': 'download',
  '.7z': 'download',
  '.gz': 'download',
  '.tar': 'download',
  '.csv': 'download',
  '.gpkg': 'download',
  '.shp': 'download',
};

function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

/**
 * Infers the type of a link from its URL and protocol.
 */
export function getLinkType(url: string, protocol?: string): CswLinkType {
  const path = getUrlPath(url).toLowerCase();
  if (path.endsWith('capabilities.xml')) {
    return 'capabilities';
  }

  const typeFromProtocol = protocol ? LINK_TYPES_BY_PROTOCOL[protocol.trim().toLowerCase()] : undefined;
  if (typeFromProtocol) {
    return typeFromProtocol;
  }

  const segments = path.split('/').filter((segment) => segment.length > 0);
  for (const segment of segments) {
    const typeFromSegment = LINK_TYPES_BY_PATH_SEGMENT[segment];
    if (typeFromSegment) {
      return typeFromSegment;
    }
  }

  const lastSegment = segments.at(-1) ?? '';
  const extensionIndex = lastSegment.lastIndexOf('.');
  if (extensionIndex !== -1) {
    const typeFromExtension = LINK_TYPES_BY_EXTENSION[lastSegment.slice(extensionIndex)];
    if (typeFromExtension) {
      return typeFromExtension;
    }
  }

  return 'other';
}

/*
 * =============================================================================
 * Response parsing
 * =============================================================================
 */

export type GetRecordsPage = {
  numberOfRecordsMatched: number;
  nextRecord: number;
  records: CswRecordBrief[];
};

function parseIntegerAttribute(element: XmlElement, name: string): number {
  const value = Number.parseInt(element.attributes[name] ?? '', 10);
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid CSW response: missing or invalid ${name} on SearchResults`);
  }
  return value;
}

/**
 * Parses a GetRecords response (elementSetName=brief, Dublin Core).
 */
export function parseGetRecordsResponse(xml: string): GetRecordsPage {
  const root = parseXmlRoot(xml);
  const searchResults = findDescendants(root, ['SearchResults'])[0];
  if (!searchResults) {
    throw new Error('Invalid CSW response: SearchResults not found');
  }

  const records = childElements(searchResults)
    .map((element): CswRecordBrief | undefined => {
      const fileIdentifier = findText(element, 'identifier');
      if (!fileIdentifier) {
        return undefined;
      }
      const record: CswRecordBrief = {
        fileIdentifier,
        title: findText(element, 'title') ?? '',
      };
      const type = findText(element, 'type');
      if (type) {
        record.type = type;
      }
      return record;
    })
    .filter((record): record is CswRecordBrief => record !== undefined);

  return {
    numberOfRecordsMatched: parseIntegerAttribute(searchResults, 'numberOfRecordsMatched'),
    nextRecord: parseIntegerAttribute(searchResults, 'nextRecord'),
    records,
  };
}

function parseOnlineResource(element: XmlElement): CswLink | undefined {
  const url = findText(element, 'linkage', 'URL');
  if (!url) {
    return undefined;
  }

  const protocol = findText(element, 'protocol', '*');
  const link: CswLink = {
    type: getLinkType(url, protocol),
    url,
  };
  if (protocol) {
    link.protocol = protocol;
  }
  const name = findText(element, 'name', '*');
  if (name) {
    link.name = name;
  }
  const description = findText(element, 'description', '*');
  if (description) {
    link.description = description;
  }
  return link;
}

function parseMetadata(metadata: XmlElement): CswRecord {
  const fileIdentifier = findText(metadata, 'fileIdentifier', '*');
  if (!fileIdentifier) {
    throw new Error('Invalid ISO 19139 record: missing fileIdentifier');
  }

  const identificationInfo = findElements(metadata, 'identificationInfo', '*');
  const type = findElements(metadata, 'hierarchyLevel', 'MD_ScopeCode')[0]?.attributes.codeListValue?.trim();
  const title = identificationInfo
    .map((info) => findText(info, 'citation', 'CI_Citation', 'title', '*'))
    .find((text) => text !== undefined);
  const abstract = identificationInfo
    .map((info) => findText(info, 'abstract', '*'))
    .find((text) => text !== undefined);
  const keywords = identificationInfo.flatMap((info) =>
    findTexts(info, 'descriptiveKeywords', 'MD_Keywords', 'keyword', '*'),
  );
  const links = findElements(
    metadata,
    'distributionInfo',
    'MD_Distribution',
    'transferOptions',
    'MD_DigitalTransferOptions',
    'onLine',
    'CI_OnlineResource',
  )
    .map(parseOnlineResource)
    .filter((link): link is CswLink => link !== undefined);

  // Fields are built in a stable order for the JSON files.
  return {
    fileIdentifier,
    ...(type ? { type } : {}),
    title: title ?? '',
    ...(abstract ? { abstract } : {}),
    keywords: [...new Set(keywords)],
    links,
  };
}

/**
 * Parses the ISO 19139 records (gmd:MD_Metadata) from a CSW response.
 */
export function parseIsoRecords(xml: string): CswRecord[] {
  const root = parseXmlRoot(xml);
  const names = ['MD_Metadata', 'MI_Metadata'];
  const metadataElements = names.includes(localName(root.name))
    ? [root]
    : findDescendants(root, names);
  return metadataElements.map(parseMetadata);
}

/*
 * =============================================================================
 * CSW Client
 * =============================================================================
 */

export class CswClient {
  private readonly cswUrl: string;
  private readonly pageSize: number;
  private readonly fetchFn: typeof fetch;

  constructor(cswUrl: string, options: CswClientOptions = {}) {
    this.cswUrl = cswUrl;
    this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    this.fetchFn = options.fetch ?? fetch;
  }

  private buildUrl(params: Record<string, string>): string {
    const url = new URL(this.cswUrl);
    url.searchParams.set('service', 'CSW');
    url.searchParams.set('version', '2.0.2');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async fetchText(operationName: string, url: string): Promise<string> {
    return retry(operationName, async () => {
      debug(`GET ${url}`);
      const response = await this.fetchFn(url);
      if (!response.ok) {
        throw new Error(`${operationName} failed: HTTP ${response.status} for ${url}`);
      }
      return response.text();
    });
  }

  /**
   * Lists all the records (fileIdentifier, title, type) with a paginated GetRecords.
   *
   * Records are sorted by identifier : without sorting, the order is not stable
   * between pages and some records may be skipped.
   */
  async listRecords(): Promise<CswRecordBrief[]> {
    const records: CswRecordBrief[] = [];
    let startPosition = 1;
    let numberOfRecordsMatched = 0;

    while (startPosition > 0) {
      const url = this.buildUrl({
        request: 'GetRecords',
        typeNames: 'csw:Record',
        resultType: 'results',
        elementSetName: 'brief',
        sortBy: 'Identifier:A',
        startPosition: String(startPosition),
        maxRecords: String(this.pageSize),
      });
      const page = parseGetRecordsResponse(await this.fetchText('csw.getRecords', url));
      numberOfRecordsMatched = page.numberOfRecordsMatched;
      records.push(...page.records);

      if (page.nextRecord !== 0 && page.nextRecord <= startPosition) {
        throw new Error(`Invalid CSW pagination: nextRecord=${page.nextRecord} after startPosition=${startPosition}`);
      }
      startPosition = page.nextRecord > numberOfRecordsMatched ? 0 : page.nextRecord;
    }

    // A partial list would wrongly flag records as missing.
    if (records.length < numberOfRecordsMatched) {
      throw new Error(
        `Incomplete CSW listing: ${records.length} records retrieved, ${numberOfRecordsMatched} expected`,
      );
    }

    return records;
  }

  /**
   * Retrieves a record in ISO 19139 with GetRecordById.
   */
  async getRecord(fileIdentifier: string): Promise<CswRecord> {
    const url = this.buildUrl({
      request: 'GetRecordById',
      id: fileIdentifier,
      elementSetName: 'full',
      outputSchema: ISO_19139_OUTPUT_SCHEMA,
    });
    const records = parseIsoRecords(await this.fetchText('csw.getRecordById', url));
    const record = records.find((candidate) => candidate.fileIdentifier === fileIdentifier);
    if (!record) {
      throw new Error(`CSW record not found: ${fileIdentifier}`);
    }
    return record;
  }
}
