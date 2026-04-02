import type { Collection } from '../types';

/** Parameters forwarded to the search engine when executing a query. */
export type CollectionSearchOptions = {
  limit?: number;
  fields?: string[];
  combineWith?: 'AND' | 'OR';
};

/** A lightweight result returned by the search engine: an id and an optional relevance score. */
export type CollectionSearchMatch = {
  id: string;
  score?: number;
};

/** Contract that any search engine implementation must satisfy. */
export interface CollectionSearchEngine {
  search(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}

/** Factory that builds a search engine from the full collection list at catalog creation time. */
export type CollectionSearchEngineFactory = (collections: Collection[]) => CollectionSearchEngine;
