import type { EnrichedCollection } from '../types';
import { loadCollectionOverwrite } from '../overwrite/overwrite-store';
import { validateOverwriteReferences } from '../overwrite/overwrite';
import { loadSourceCollections } from '../source/source-store';
import { merge } from './merge';

/*
 * =============================================================================
 * Enrichment pipeline
 * =============================================================================
 */

export function loadEnrichedCollections(): EnrichedCollection[] {
  const sourceCollections = loadSourceCollections();

  return sourceCollections.map((collection) => {
    const overwrite = loadCollectionOverwrite(collection.namespace, collection.name);
    if (overwrite) {
      validateOverwriteReferences(collection, overwrite);
    }
    return merge(collection, overwrite);
  });
}
