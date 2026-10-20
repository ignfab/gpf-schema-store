import { parseXml, XmlElement } from '@rgrove/parse-xml';

import type { CswLink, CswRecord, CswRecordBrief } from '../types';
import { getLinkType } from './link-type';

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
 * ISO 19139 / Dublin Core parsing
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
