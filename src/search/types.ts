import type { CollectionSchema, EnrichedCollection } from '../types';

/** Generic catalog-level options applied after search-engine evaluation. */
export type CollectionSearchOptions = {
  limit?: number;
};

/** A lightweight result returned by the search engine: an id and an optional relevance score. */
export type CollectionSearchMatch = {
  id: string;
  score?: number;
};

/** A catalog search result that includes the resolved collection and optional relevance score. */
export type CollectionSearchResult = {
  id: string;
  collection: CollectionSchema;
  score?: number;
};

/** Contract that any search engine implementation must satisfy. */
export interface CollectionSearchEngine {
  search(query: string): CollectionSearchMatch[];
}

/** Factory that builds a search engine from the full collection list at catalog creation time. */
export type CollectionSearchEngineFactory = (collections: EnrichedCollection[]) => CollectionSearchEngine;
