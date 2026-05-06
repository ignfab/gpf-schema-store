import { renderCollectionSchema } from '../renderers/collection-schema';
import type { CollectionSchema, EnrichedCollection } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchEngineFactory,
  CollectionSearchMatch,
  CollectionSearchOptions,
  CollectionSearchResult,
} from './types';

/*
 * =============================================================================
 * Catalog API
 * =============================================================================
 *
 * The catalog is the public in-memory view exposed to callers:
 * - it stores internal EnrichedCollection inputs
 * - it renders them once as public CollectionSchema objects
 * - it optionally delegates query ranking to a search engine
 */

export interface CollectionCatalog {
  list(): CollectionSchema[];
  getById(id: string): CollectionSchema | undefined;
  search(query: string, options?: CollectionSearchOptions): CollectionSchema[];
  searchWithScores(query: string, options?: CollectionSearchOptions): CollectionSearchResult[];
}

export type InMemoryCollectionCatalogOptions =
  | { engine: CollectionSearchEngine; engineFactory?: never }
  | { engineFactory: CollectionSearchEngineFactory; engine?: never }
  | { engine?: never; engineFactory?: never };

/*
 * =============================================================================
 * In-memory catalog implementation
 * =============================================================================
 */

export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: EnrichedCollection[];
  private readonly schemasById: Map<string, CollectionSchema>;
  private readonly searchEngine?: CollectionSearchEngine;

  constructor(collections: EnrichedCollection[], options: InMemoryCollectionCatalogOptions = {}) {
    this.collections = collections;

    // Render the public schema view once at construction time and keep it
    // indexed by collection id for later lookup and search result resolution.
    this.schemasById = new Map(
      collections.map((collection) => [collection.id, renderCollectionSchema(collection)]),
    );

    if (options.engine && options.engineFactory) {
      throw new Error('Cannot specify both engine and engineFactory options');
    }
    if (options.engine) {
      this.searchEngine = options.engine;
    } else if (options.engineFactory) {
      this.searchEngine = options.engineFactory(collections);
    }
  }

  list(): CollectionSchema[] {
    // Return the full public catalog view while preserving the original
    // collection order from the internal source list.
    return this.collections.map((collection) => structuredClone(this.schemasById.get(collection.id)!));
  }

  getById(id: string): CollectionSchema | undefined {
    const schema = this.schemasById.get(id);
    return schema ? structuredClone(schema) : undefined;
  }

  /*
   * =============================================================================
   * Search helpers
   * =============================================================================
   */

  private getSearchEngine(): CollectionSearchEngine {
    if (!this.searchEngine) {
      throw new Error('No search engine configured');
    }
    return this.searchEngine;
  }

  private resolveSearchResults(
    matches: CollectionSearchMatch[],
    options: CollectionSearchOptions = {},
  ): CollectionSearchResult[] {
    
    const maxResults = typeof options.limit === 'number' && options.limit >= 0
      ? options.limit
      : undefined;
    const results: CollectionSearchResult[] = [];

    // Keep the search-engine ranking order while resolving IDs to collections.
    // Stop early once the limit is reached to avoid cloning unused items.
    for (const match of matches) {
      if (maxResults !== undefined && results.length >= maxResults) {
        break;
      }

      const schema = this.schemasById.get(match.id);
      if (!schema) {
        continue;
      }

      results.push({
        id: match.id,
        collection: structuredClone(schema),
        score: match.score,
      });
    }

    return results;
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSchema[] {
    return this.searchWithScores(query, options).map(({ collection }) => collection);
  }

  searchWithScores(query: string, options: CollectionSearchOptions = {}): CollectionSearchResult[] {
    // The search engine only ranks ids. The catalog resolves those ids back to
    // the public schema objects returned to callers.
    const matches = this.getSearchEngine().search(query);
    return this.resolveSearchResults(matches, options);
  }
}
