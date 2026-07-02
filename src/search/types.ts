/**
 * Generic search options that a catalog can pass to a search engine.
 */
export type CollectionSearchOptions = {
  limit?: number;
};

/** 
 * A lightweight result returned by the search engine: an id and an optional relevance score. 
 */
export type CollectionSearchMatch = {
  id: string;
  score?: number;
};


/** 
 * Contract that any search engine implementation must satisfy.
 */
export interface CollectionSearchEngine {
  search(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}
