import type { Collection, CollectionProperty } from '../types.ts';
import { WfsEndpoint, type WfsFeatureTypeBrief } from '@camptocamp/ogc-client';

/**
 * Filter the feature types to only relevant ones for the schema store.
 *
 * @param featureType The feature type to filter.
 * @returns True if the feature type should be included, false otherwise.
 */
function filterFeatureType(featureType: WfsFeatureTypeBrief): boolean {
  if (featureType.name.startsWith('test_')) {
    console.log(`Skipping test data: ${featureType.name}`);
    return false;
  }
  if ( ! ( featureType.name.startsWith('ADMINEXPRESS-COG') || featureType.name.startsWith('BDTOPO_V3') ) ) {
    console.log(`Skip ${featureType.name} (only ADMINEXPRESS-COG and BDTOPO_V3 are supported for a while)`);
    return false;
  }
  return true;
}

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

  const featureTypes = await endpoint.getFeatureTypes();
  console.log(`Found ${featureTypes.length} feature types`);
  for (const featureType of featureTypes.filter(filterFeatureType)) {
    console.log(`Processing feature type: ${featureType.name}...`);
    const [namespace, name] = featureType.name.split(':');

    /**
     * retrieve the full feature type (with properties)
     */
    const featureTypeFull = await endpoint.getFeatureTypeFull(featureType.name);

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
      properties: properties,
    };

    // sleep 200 ms to avoid facing rate limiting...
    await new Promise(resolve => setTimeout(resolve, 100));
    collections.push(collection);
  }
  return collections;
}
