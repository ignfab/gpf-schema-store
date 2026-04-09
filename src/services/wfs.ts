import { debuglog } from 'node:util';
const debug = debuglog('gpf-schema-store:wfs');

import type { Collection, CollectionBrief, CollectionProperty } from '../types';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import { retry } from '../helpers/retry';

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
      debug(`Create WfsEndpoint for ${this.wfsUrl} ...`);
      this.endpoint = new WfsEndpoint(this.wfsUrl);
      debug('Ensure that WfsEndpoint is ready ...');
      await this.endpoint.isReady();
    }
    return this.endpoint;
  }


  /**
   * Get the collection from the WFS endpoint (GetCapabilities).
   */
  async getCollections(): Promise<CollectionBrief[]> {
    debug(`Getting collections from ${this.wfsUrl} (GetCapabilities) ...`);

    const endpoint = await retry('wfs.ensureClientIsReady', () => this.getWfsEndpoint());

    const featureTypes = await retry('wfs.getFeatureTypes', () => endpoint.getFeatureTypes());
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

    const endpoint = await retry('wfs.ensureClientIsReady', () => this.getWfsEndpoint());

    const featureTypeFull = await retry(
      `wfs.getFeatureTypeFull(${collectionId})`,
      () => endpoint.getFeatureTypeFull(collectionId),
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
