import type { Collection } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchEngineFactory,
  CollectionSearchMatch,
  CollectionSearchOptions,
  CollectionSearchResult,
} from './types';

export interface CollectionCatalog {
  list(): Collection[];
  getById(id: string): Collection | undefined;
  search(query: string, options?: CollectionSearchOptions): Collection[];
  searchWithScores(query: string, options?: CollectionSearchOptions): CollectionSearchResult[];
}

export type InMemoryCollectionCatalogOptions =
  | { engine: CollectionSearchEngine; engineFactory?: never }
  | { engineFactory: CollectionSearchEngineFactory; engine?: never }
  | { engine?: never; engineFactory?: never };

export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: Collection[];
  private readonly byId: Map<string, Collection>;
  private readonly searchEngine?: CollectionSearchEngine;

  constructor(collections: Collection[], options: InMemoryCollectionCatalogOptions = {}) {
    this.collections = collections;
    this.byId = new Map(collections.map((collection) => [collection.id, collection]));

    if (options.engine && options.engineFactory) {
      throw new Error('Cannot specify both engine and engineFactory options');
    }
    if (options.engine) {
      this.searchEngine = options.engine;
    } else if (options.engineFactory) {
      this.searchEngine = options.engineFactory(collections);
    }
  }

  list(): Collection[] {
    return structuredClone(this.collections);
  }

  getById(id: string): Collection | undefined {
    const collection = this.byId.get(id);
    return collection ? structuredClone(collection) : undefined;
  }

  private getSearchEngine(): CollectionSearchEngine {
    if (!this.searchEngine) {
      throw new Error('No search engine configured');
    }
    return this.searchEngine;
  }

  private resolveMatches(
    matches: CollectionSearchMatch[],
    options: CollectionSearchOptions = {},
  ): CollectionSearchResult[] {
    const limit = options.limit;
    const hasLimit = typeof limit === 'number' && limit >= 0;
    const resolvedResults: CollectionSearchResult[] = [];

    // Keep the search-engine ranking order while resolving IDs to collections.
    // Stop early once the limit is reached to avoid cloning unused items.
    for (const match of matches) {
      if (hasLimit && resolvedResults.length >= limit) {
        break;
      }
      const collection = this.byId.get(match.id);
      if (collection !== undefined) {
        resolvedResults.push({
          collection: structuredClone(collection),
          score: match.score,
        });
      }
    }

    return resolvedResults;
  }

  search(query: string, options: CollectionSearchOptions = {}): Collection[] {
    return this.searchWithScores(query, options).map(({ collection }) => collection);
  }

  searchWithScores(query: string, options: CollectionSearchOptions = {}): CollectionSearchResult[] {
    const matches = this.getSearchEngine().search(query);
    return this.resolveMatches(matches, options);
  }
}
