import { debuglog } from 'node:util';
import { WfsEndpoint, type WfsFeatureTypeBrief } from '@camptocamp/ogc-client';
import {
  isGeometryPropertyType,
  type SourceCollection,
  type SourceCollectionBrief,
  type SourceCollectionProperty,
} from '../types';
import '../helpers/configure-fetch';
import { parseFeatureTypeName } from '../helpers/metadata';
import { retry } from '../helpers/retry';
import { describeFeatureType, type WfsFeatureType } from './wfs/describeFeatureType';
import { toPropertyType } from './wfs/toPropertyType';

const debug = debuglog('gpf-schema-store:wfs');

/*
 * =============================================================================
 * Endpoint Helpers
 * =============================================================================
 */

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

async function createWfsEndpoint(wfsUrl: string): Promise<WfsEndpoint> {
  debug(`Create WfsEndpoint for ${wfsUrl} ...`);
  const endpoint = new WfsEndpoint(wfsUrl);
  debug('Ensure that WfsEndpoint is ready ...');
  await withScopedEndpointErrorSuppression(() => endpoint.isReady());
  return endpoint;
}


/*
 * =============================================================================
 * WFS Client
 * =============================================================================
 */

export class WfsClient {
  private readonly wfsUrl: string;
  private endpoint: WfsEndpoint | undefined;

  constructor(wfsUrl: string) {
    this.wfsUrl = wfsUrl;
  }

  /*
   * ---------------------------------------------------------------------------
   * Endpoint lifecycle
   * ---------------------------------------------------------------------------
   */

  async getWfsEndpoint(): Promise<WfsEndpoint> {
    if (!this.endpoint) {
      this.endpoint = await retry(
        'wfs.createEndpoint',
        () => createWfsEndpoint(withTimestampCacheBuster(this.wfsUrl)),
      );
    }
    return this.endpoint;
  }

  /*
   * ---------------------------------------------------------------------------
   * Public WFS reads
   * ---------------------------------------------------------------------------
   */

  /**
   * Get collection list from WFS GetCapabilities.
   */
  async getCollections(): Promise<SourceCollectionBrief[]> {
    debug(`Getting collections from ${this.wfsUrl} (GetCapabilities) ...`);

    const endpoint = await this.getWfsEndpoint();
    const featureTypes = endpoint.getFeatureTypes();
    return featureTypes.map(this.toSourceCollectionBrief.bind(this));
  }

  /**
   * Get collection from WFS DescribeFeatureType.
   */
  async getCollection(collectionId: string): Promise<SourceCollection> {
    debug(`Getting collection ${collectionId} from ${this.wfsUrl} (DescribeFeatureType) ...`);

    const featureType = await retry(
      `wfs.describeFeatureType(${collectionId})`,
      async () => {
        return describeFeatureType(this.wfsUrl, collectionId);
      },
    );
    return this.toSourceCollection(collectionId, featureType);
  }


  /*
  * =============================================================================
  * Collection Mapping
  * =============================================================================
  */

  private toSourceCollectionBrief(featureType: WfsFeatureTypeBrief): SourceCollectionBrief {
    const { namespace, name } = parseFeatureTypeName(featureType.name);

    return {
      id: featureType.name,
      namespace,
      name,
      title: featureType.title ?? '',
      description: featureType.abstract ?? '',
    };
  }


  private toSourceCollection(collectionId: string, featureType: WfsFeatureType): SourceCollection {
    const { namespace, name } = parseFeatureTypeName(collectionId);

    /*
     * Retreive infos available in GetCapabilities
     */
    const featureTypeSummary = this.endpoint?.getFeatureTypeSummary(collectionId);
    if ( ! featureTypeSummary ){
      throw new Error(`fail to retreive FeatureTypeSummary from ogc-client for ${collectionId}`);
    }

    /*
     * Convert wfs properties
     */
    const properties: SourceCollectionProperty[] = [];
    for ( const wfsProperty of featureType.properties ){
      const property : SourceCollectionProperty = {
        name: wfsProperty.name,
        type: toPropertyType(wfsProperty.localType)
      };
      if ( isGeometryPropertyType(property.type) ){
        property.defaultCrs = featureTypeSummary.defaultCrs
      }
      properties.push(property);
    }

    return {
      id: collectionId,
      namespace,
      name,
      title: featureTypeSummary.title ?? '',
      description: featureTypeSummary.abstract ?? '',
      properties: properties,
    };
  }


}
