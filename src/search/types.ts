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
 * A result returned by the search engine.
 *
 * Only `id` is guaranteed. The other fields explain the match: they are provided by the
 * default MiniSearch engine, but other implementations are not guaranteed to provide them.
 */
export type CollectionSearchMatch = {
  id: string;
  /**
   * Relevance score (higher is better).
   */
  score?: number;
  /**
   * Terms of the query (after normalization).
   */
  queryTerms?: string[];
  /**
   * Indexed terms matching the query terms (may differ from queryTerms with fuzzy search).
   */
  terms?: string[];
  /**
   * For each matching term, the names of the fields where it was found.
   */
  match?: Record<string, string[]>;
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
