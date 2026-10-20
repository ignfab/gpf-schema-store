import type { CswLinkType } from '../types';

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
