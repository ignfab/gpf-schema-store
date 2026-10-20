/**
 * Generic search options that a catalog can pass to a search engine.
 */
export type CollectionSearchOptions = {
  /**
   * Maximum number of matches to return.
   */
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
  /**
   * Returns the matches for the query, best first.
   *
   * Implementations MUST honor options.limit: return at most `limit` matches.
   * (the catalog also truncates the results defensively, see #65)
   */
  search(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}
