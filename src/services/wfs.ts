import type { Collection } from '../types.ts';
import { WfsEndpoint } from '@camptocamp/ogc-client';

/**
 * Get the collections from a WFS endpoint.
 * 
 * @param wfsUrl 
 * @returns The collections.
 */
export async function getCollections(wfsUrl: string): Promise<Collection[]> {
  console.log('Getting collections from', wfsUrl);
  const endpoint = new WfsEndpoint(wfsUrl);
  await endpoint.isReady();
  const collections: Collection[] = [];
  for (const featureType of endpoint.getFeatureTypes()) {
    
    const [namespace, name] = featureType.name.split(':');

    const collection: Collection = {
      id: featureType.name,
      namespace: namespace,
      name: name,
      title: featureType.title ?? '',
      description: featureType.abstract ?? '',
    };
    
    collections.push(collection);
  }
  return collections;
}
