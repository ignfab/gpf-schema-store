import { debuglog } from 'node:util';
import { WfsEndpoint, type WfsFeatureTypeBrief, type WfsFeatureTypeFull } from '@camptocamp/ogc-client';
import {
  assertIsValidPropertyType,
  type SourceCollection,
  type SourceCollectionBrief,
  type SourceCollectionProperty,
} from '../types';
import '../helpers/configure-fetch';
import { parseFeatureTypeName } from '../helpers/metadata';
import { retry } from '../helpers/retry';

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
   * Gets the list of collections from the WFS endpoint (GetCapabilities).
   * @returns an array of SourceCollectionBrief objects representing the collections
   */
  async getCollections(): Promise<SourceCollectionBrief[]> {
    debug(`Getting collections from ${this.wfsUrl} (GetCapabilities) ...`);

    const endpoint = await this.getWfsEndpoint();
    // Cast to unknown: we validate the runtime shape ourselves rather than trusting ogc-client types.
    const featureTypes = endpoint.getFeatureTypes();
    return featureTypes.map(this.toSourceCollectionBrief.bind(this));
  }

  /**
   * Gets a specific collection from the WFS endpoint (DescribeFeatureType).
   * @param collectionId the ID of the collection to retrieve
   * @returns the requested SourceCollection
   */
  async getCollection(collectionId: string): Promise<SourceCollection> {
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
    return this.toSourceCollection(collectionId, featureTypeFull);
  }

  /*
   * =============================================================================
   * Collection Mapping (WFS -> SourceCollectionBrief / SourceCollection)
   * =============================================================================
   */

  /**
   * Converts entry from WFS GetCapabilities into a SourceCollectionBrief.
   * @param featureType the WFS feature type brief to convert
   * @returns the converted SourceCollectionBrief
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

  /**
   * Converts entry from WFS DescribeFeatureType into a SourceCollection.
   * @param collectionId the collection ID (feature type name) to convert
   * @param featureTypeFull the result of WFS DescribeFeatureType for the given collection ID
   * @returns the converted SourceCollection
   */
  private toSourceCollection(collectionId: string, featureTypeFull: WfsFeatureTypeFull): SourceCollection {
    const { namespace, name } = parseFeatureTypeName(collectionId);

    return {
      id: collectionId,
      namespace,
      name,
      title: featureTypeFull.title ?? '',
      description: featureTypeFull.abstract ?? '',
      properties: this.toSourceCollectionProperties(featureTypeFull, collectionId),
    };
  }

  /**
   * Converts entry from WFS DescribeFeatureType into SourceCollectionProperty array.
   * @param featureTypeFull the result of WFS DescribeFeatureType for the given collection ID
   * @param collectionId the collection ID (feature type name) to convert
   * @returns the converted SourceCollectionProperty array
   */
  private toSourceCollectionProperties(
    featureTypeFull: WfsFeatureTypeFull,
    collectionId: string,
  ): SourceCollectionProperty[] {
    const properties: SourceCollectionProperty[] = Object.entries(featureTypeFull.properties).map(
      ([propertyName, propertyType]) => ({
        name: propertyName,
        type: assertIsValidPropertyType(
          propertyType,
          `for property "${propertyName}" in collection "${collectionId}"`,
        ),
      }),
    );

    if (!featureTypeFull.geometryName) {
      return properties;
    }

    const geometryType = featureTypeFull.geometryType ?? 'geometry';
    const normalizedGeometryType = geometryType !== 'unknown' ? geometryType : 'geometry';

    properties.push({
      name: featureTypeFull.geometryName,
      type: assertIsValidPropertyType(
        normalizedGeometryType,
        `for geometry property "${featureTypeFull.geometryName}" in collection "${collectionId}"`,
      ),
      defaultCrs: featureTypeFull.defaultCrs,
    });

    return properties;
  }


}
