import { debuglog } from 'node:util';
const debug = debuglog('gpf-schema-store:wfs');

import type { Collection, CollectionBrief, CollectionProperty, NamespaceFilterRule } from '../types';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import { retry } from '../helpers/retry';
import { getMetadataFromNamespace } from '../helpers/metadata';

/**
 * Default matching rule with a wildcard pattern that matches all namespaces 
 * and does not ignore any collection.
 */
const DEFAULT_MATCHING_RULE: NamespaceFilterRule = {
  id: 'default',
  patterns: ['*'],
  metadata: {
    ignored: false
  }
};

/**
 * A client to interact with a WFS endpoint and retrieve the collections.
 */
export class WfsClient {
  private endpoint: WfsEndpoint;

  /**
   * @param wfsUrl the URL of the WFS endpoint (https://data.geopf.fr/wfs)
   */
  constructor(
    wfsUrl: string
  ) {
    this.endpoint = new WfsEndpoint(wfsUrl);
  }

  /**
   * Get the collection from the WFS endpoint (GetCapabilities).
   */
  async getCollections(): Promise<CollectionBrief[]> {
    await retry('wfs.isReady', () => this.endpoint.isReady());

    const featureTypes = await retry('wfs.getFeatureTypes', () => this.endpoint.getFeatureTypes());
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
    await retry('wfs.isReady', () => this.endpoint.isReady());

    const featureTypeFull = await retry(
      `wfs.getFeatureTypeFull(${collectionId})`,
      () => this.endpoint.getFeatureTypeFull(collectionId),
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

    const collection: Collection = {
      id: collectionId,
      namespace: collectionId.split(':')[0],
      name: collectionId.split(':')[1],
      title: featureTypeFull.title ?? '',
      description: featureTypeFull.abstract ?? '',
      properties: properties
    };

    return collection;
  }
}




/**
 * Get the collections from a WFS endpoint.
 * 
 * @deprecated Use the WfsClient class instead and its getCollections method.
 * 
 * @param wfsUrl 
 * @returns The collections.
 */
export async function getCollections(
  wfsUrl: string,
  options: {
    namespaceFilterRules?: NamespaceFilterRule[],
    withProperties?: boolean
  } = {}): Promise<Collection[]> {
  const withProperties = options.withProperties ?? true;
  const namespaceFilterRules = options.namespaceFilterRules ?? [DEFAULT_MATCHING_RULE];

  debug(`Getting collections from ${wfsUrl} (GetCapabilities)...`);
  const endpoint = new WfsEndpoint(wfsUrl);
  await retry('wfs.isReady', () => endpoint.isReady());
  const collections: Collection[] = [];

  const featureTypes = await retry('wfs.getFeatureTypes', () => endpoint.getFeatureTypes());
  debug(`Found ${featureTypes.length} feature types`);
  for (const featureType of featureTypes) {
    debug(`Extract namespace and name for ${featureType.name}...`);
    const [namespace, name] = featureType.name.split(':');

    /**
     * Retrieve the metadata of the collection from its namespace.
     * If the collection is ignored, skip the DescribeFeatureType
     * and return a collection with no properties.
     */
    const metadata = getMetadataFromNamespace(namespace, namespaceFilterRules);
    if (metadata.ignored || !withProperties) {
      const reason = metadata.ignored ? `ignored (${metadata.ignoredReason})` : 'withProperties=false';
      debug(`Skipping DescribeFeatureType for feature type ${featureType.name} (${reason})`);
      collections.push({
        id: featureType.name,
        namespace: namespace,
        name: name,
        title: featureType.title ?? '',
        description: featureType.abstract ?? '',
        properties: []
      } as Collection);
      continue;
    }

    /**
     * retrieve the full feature type (with properties)
     */
    const featureTypeFull = await retry(
      `wfs.getFeatureTypeFull(${featureType.name})`,
      () => endpoint.getFeatureTypeFull(featureType.name),
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

    const collection: Collection = {
      id: featureType.name,
      namespace: namespace,
      name: name,
      title: featureType.title ?? '',
      description: featureType.abstract ?? '',
      properties: properties
    };

    // sleep 100 ms to avoid facing rate limiting...
    await new Promise(resolve => setTimeout(resolve, 100));
    collections.push(collection);
  }
  return collections;
}
