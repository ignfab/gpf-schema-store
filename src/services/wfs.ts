import type { Collection, CollectionProperty } from '../types.ts';
import { WfsEndpoint } from '@camptocamp/ogc-client';
import { retry } from '../helpers/retry';
import { getMetadataFromNamespace } from '../helpers/metadata.ts';


/**
 * Get the collections from a WFS endpoint.
 * 
 * @param wfsUrl 
 * @returns The collections.
 */
export async function getCollections(wfsUrl: string, options: { withProperties: boolean } = { withProperties: true }): Promise<Collection[]> {
  const { withProperties } = options;
  console.log('Getting collections from', wfsUrl);
  const endpoint = new WfsEndpoint(wfsUrl);
  await retry('wfs.isReady', () => endpoint.isReady());
  const collections: Collection[] = [];

  const featureTypes = await retry('wfs.getFeatureTypes', () => endpoint.getFeatureTypes());
  console.log(`Found ${featureTypes.length} feature types`);
  for (const featureType of featureTypes) {
    console.log(`Processing feature type: ${featureType.name}...`);
    const [namespace, name] = featureType.name.split(':');

    /**
     * Retrieve the metadata of the collection from its namespace.
     * If the collection is ignored, skip the DescribeFeatureType
     * and return a collection with no properties.
     */
    const metadata = getMetadataFromNamespace(namespace);
    if (metadata.ignored || ! withProperties ) {
      console.log(`Skipping DescribeFeatureType for feature type ${featureType.name} (ignored: ${metadata.ignoredReason})`);
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

    if ( featureTypeFull.geometryName ) {
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
