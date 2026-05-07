import { debuglog } from 'node:util';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import { formatSchemaIssues } from '../helpers/zod';
import {
  assertIsValidPropertyType,
  wfsFeatureTypeFullSchema,
  wfsFeatureTypeSchema,
  type SourceCollection,
  type SourceCollectionBrief,
  type SourceCollectionProperty,
  type WfsFeatureType,
  type WfsFeatureTypeFull,
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
 * Collection Mapping
 * =============================================================================
 */

function parseWfsFeatureTypes(raw: unknown): WfsFeatureType[] {
  const result = wfsFeatureTypeSchema.array().safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid WFS GetCapabilities payload: ${formatSchemaIssues(result.error)}`);
  }
  return result.data;
}

function parseWfsFeatureTypeFull(raw: unknown, collectionId: string): WfsFeatureTypeFull {
  const result = wfsFeatureTypeFullSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid WFS DescribeFeatureType payload for "${collectionId}": ${formatSchemaIssues(result.error)}`,
    );
  }
  return result.data;
}

function toSourceCollectionBrief(featureType: WfsFeatureType): SourceCollectionBrief {
  const { namespace, name } = parseFeatureTypeName(featureType.name);

  return {
    id: featureType.name,
    namespace,
    name,
    title: featureType.title ?? '',
    description: featureType.abstract ?? '',
  };
}

function toSourceCollectionProperties(
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

function toSourceCollection(collectionId: string, featureTypeFull: WfsFeatureTypeFull): SourceCollection {
  const { namespace, name } = parseFeatureTypeName(collectionId);

  return {
    id: collectionId,
    namespace,
    name,
    title: featureTypeFull.title ?? '',
    description: featureTypeFull.abstract ?? '',
    properties: toSourceCollectionProperties(featureTypeFull, collectionId),
  };
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

  async getCollections(): Promise<SourceCollectionBrief[]> {
    debug(`Getting collections from ${this.wfsUrl} (GetCapabilities) ...`);

    const endpoint = await this.getWfsEndpoint();
    // Cast to unknown: we validate the runtime shape ourselves rather than trusting ogc-client types.
    const featureTypes = parseWfsFeatureTypes(endpoint.getFeatureTypes() as unknown);
    return featureTypes.map(toSourceCollectionBrief);
  }

  async getCollection(collectionId: string): Promise<SourceCollection> {
    debug(`Getting collection ${collectionId} from ${this.wfsUrl} (DescribeFeatureType) ...`);

    const rawFeatureTypeFull = await retry(
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
    const featureTypeFull = parseWfsFeatureTypeFull(rawFeatureTypeFull, collectionId);
    return toSourceCollection(collectionId, featureTypeFull);
  }
}
