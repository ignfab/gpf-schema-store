import { debuglog } from 'node:util';
const debug = debuglog('gpf-schema-store:wfs');

import type { Collection, CollectionBrief, CollectionProperty } from '../types';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import '../helpers/configure-fetch';
import { retry } from '../helpers/retry';

function withTimestampCacheBuster(wfsUrl: string): string {
  const url = new URL(wfsUrl);
  url.searchParams.set('_t', String(Date.now() + Math.random()));
  return url.toString();
}

function isEndpointError(error: unknown): boolean {
  return error instanceof Error && error.name === 'EndpointError';
}

async function flushUnhandledRejectionQueue(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

// ogc-client can emit an extra unhandled EndpointError for a rejection we already await.
// Keep the suppression scoped to the call so retry still receives the awaited failure.
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
      const [namespace, name] = featureType.name.split(':');
      collections.push({
        id: featureType.name,
        namespace: namespace,
        name: name,
        title: featureType.title ?? '',
        description: featureType.abstract ?? '',
      } as CollectionBrief);
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
      return {
        name: propertyName,
        type: featureTypeFull.properties[propertyName]
      } as CollectionProperty;
    });

    if (featureTypeFull.geometryName) {
      properties.push({
        name: featureTypeFull.geometryName,
        type: featureTypeFull.geometryType ?? 'geometry',
        defaultCrs: featureTypeFull.defaultCrs
      } as CollectionProperty);
    }

    const [namespace, name] = collectionId.split(':');

    const collection: Collection = {
      id: collectionId,
      namespace: namespace,
      name: name,
      title: featureTypeFull.title ?? '',
      description: featureTypeFull.abstract ?? '',
      properties: properties
    };

    return collection;
  }
}
