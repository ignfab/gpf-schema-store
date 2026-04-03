import type { Collection } from '../types';

/** Generic catalog-level options applied after search-engine evaluation. */
export type CollectionSearchOptions = {
  limit?: number;
};

/** A lightweight result returned by the search engine: an id and an optional relevance score. */
export type CollectionSearchMatch = {
  id: string;
  score?: number;
};

/** Contract that any search engine implementation must satisfy. */
export interface CollectionSearchEngine {
  search(query: string): CollectionSearchMatch[];
}

/** Factory that builds a search engine from the full collection list at catalog creation time. */
export type CollectionSearchEngineFactory = (collections: Collection[]) => CollectionSearchEngine;
