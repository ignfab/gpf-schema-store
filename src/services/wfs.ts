import { debuglog } from 'node:util';
const debug = debuglog('gpf-schema-store:wfs');

import type { Collection, CollectionBrief, CollectionProperty } from '../types';
import { assertIsValidPropertyType } from '../types';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import '../helpers/configure-fetch';
import { retry } from '../helpers/retry';
import { parseFeatureTypeName } from '../helpers/metadata';
import { filterCollectionKeywords } from '../helpers/keywords';

/**
 * Add a timestamp cache buster to the WFS URL to avoid caching issues
 */
function withTimestampCacheBuster(wfsUrl: string): string {
  const url = new URL(wfsUrl);
  url.searchParams.set('_t', String(Date.now() + Math.random()));
  return url.toString();
}

/**
 * Check if the error is an EndpointError from ogc-client.
 */
function isEndpointError(error: unknown): boolean {
  return error instanceof Error && error.name === 'EndpointError';
}

/**
 * Flush the unhandled rejection queue to avoid unhandled rejection errors.
 */
async function flushUnhandledRejectionQueue(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * This is a dirty hack to suppress unhandled rejection errors from ogc-client.
 * 
 * @see https://github.com/camptocamp/ogc-client/issues/138
 */
async function withScopedEndpointErrorSuppression<T>(operation: () => Promise<T>): Promise<T> {
  const onUnhandledRejection = (error: unknown) => {
    if (isEndpointError(error)) {
      debug('Suppressing scoped EndpointError from ogc-client...');
      return;
    }
    throw error;
  };

  process.on('unhandledRejection', onUnhandledRejection);
  try {
    return await operation();
  } finally {
    await flushUnhandledRejectionQueue();
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

/**
 * Create a WfsEndpoint instance and ensure it is ready.
 * 
 * @param wfsUrl string
 * @returns Promise<WfsEndpoint>
 */
async function createWfsEndpoint(wfsUrl: string): Promise<WfsEndpoint> {
  debug(`Create WfsEndpoint for ${wfsUrl} ...`);
  const endpoint = new WfsEndpoint(wfsUrl);
  debug('Ensure that WfsEndpoint is ready ...');
  await withScopedEndpointErrorSuppression(() => endpoint.isReady());
  return endpoint;
}

/**
 * A client to interact with a WFS endpoint and retrieve the collections.
 */
export class WfsClient {
  private wfsUrl: string;
  private endpoint: WfsEndpoint | undefined;

  /**
   * @param wfsUrl the URL of the WFS endpoint (https://data.geopf.fr/wfs)
   */
  constructor(
    wfsUrl: string
  ) {
    this.wfsUrl = wfsUrl;
  }

  async getWfsEndpoint(): Promise<WfsEndpoint> {
    if (!this.endpoint) {
      this.endpoint = await retry(
        'wfs.createEndpoint',
        () => createWfsEndpoint(withTimestampCacheBuster(this.wfsUrl)),
      );
    }
    return this.endpoint;
  }

  /**
   * Get the collection from the WFS endpoint (GetCapabilities).
   */
  async getCollections(): Promise<CollectionBrief[]> {
    debug(`Getting collections from ${this.wfsUrl} (GetCapabilities) ...`);

    const endpoint = await this.getWfsEndpoint();

    const featureTypes = endpoint.getFeatureTypes();
    const collections: CollectionBrief[] = [];
    for (const featureType of featureTypes) {
      const { namespace, name } = parseFeatureTypeName(featureType.name);
      // getFeatureTypes() is the listing API, but its brief type does not
      // expose keywords. Summary reads the same parsed GetCapabilities object.
      const rawKeywords = endpoint.getFeatureTypeSummary(featureType.name)?.keywords;
      const keywords = filterCollectionKeywords(rawKeywords);
      collections.push({
        id: featureType.name,
        namespace,
        name,
        title: featureType.title ?? '',
        description: featureType.abstract ?? '',
        ...(keywords?.length ? { keywords } : {}),
      });
    }
    return collections;
  }

  /**
   * Get the collection with its properties from the WFS endpoint (DescribeFeatureType).
   * @param collectionId 
   * @returns 
   */
  async getCollection(collectionId: string): Promise<Collection> {
    debug(`Getting collection ${collectionId} from ${this.wfsUrl} (DescribeFeatureType) ...`);

    const featureTypeFull = await retry(
      `wfs.getFeatureTypeFull(${collectionId})`,
      async (attempt) => {
        const endpoint = attempt === 1
          ? await this.getWfsEndpoint()
          : await createWfsEndpoint(withTimestampCacheBuster(this.wfsUrl));
        const featureType = await withScopedEndpointErrorSuppression(
          () => endpoint.getFeatureTypeFull(collectionId),
        );
        if (attempt > 1) {
          this.endpoint = endpoint;
        }
        return featureType;
      },
    );

    const properties = Object.getOwnPropertyNames(featureTypeFull.properties).map((propertyName) => {
      const propertyType = featureTypeFull.properties[propertyName];
      return {
        name: propertyName,
        type: assertIsValidPropertyType(propertyType, `for property "${propertyName}" in collection "${collectionId}"`)
      } as CollectionProperty;
    });

    if (featureTypeFull.geometryName) {
      const geometryType = featureTypeFull.geometryType ?? 'geometry';
      const normalizedType = geometryType !== 'unknown' ? geometryType : 'geometry';
      properties.push({
        name: featureTypeFull.geometryName,
        type: assertIsValidPropertyType(normalizedType, `for geometry property "${featureTypeFull.geometryName}" in collection "${collectionId}"`),
        defaultCrs: featureTypeFull.defaultCrs
      } as CollectionProperty);
    }

    const { namespace, name } = parseFeatureTypeName(collectionId);
    const keywords = filterCollectionKeywords(featureTypeFull.keywords);

    const collection: Collection = {
      id: collectionId,
      namespace: namespace,
      name: name,
      title: featureTypeFull.title ?? '',
      description: featureTypeFull.abstract ?? '',
      ...(keywords?.length ? { keywords } : {}),
      properties: properties
    };

    return collection;
  }
}
