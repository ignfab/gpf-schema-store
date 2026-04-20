import { renderCollectionSchema } from '../renderers/collection-schema';
import type { Collection, CollectionSchema } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchEngineFactory,
  CollectionSearchMatch,
  CollectionSearchOptions,
  CollectionSearchResult,
} from './types';

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

export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: Collection[];
  private readonly schemasById: Map<string, CollectionSchema>;
  private readonly searchEngine?: CollectionSearchEngine;

  constructor(collections: Collection[], options: InMemoryCollectionCatalogOptions = {}) {
    this.collections = collections;
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
    return this.collections.map((collection) => structuredClone(this.schemasById.get(collection.id)!));
  }

  getById(id: string): CollectionSchema | undefined {
    const schema = this.schemasById.get(id);
    return schema ? structuredClone(schema) : undefined;
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
      const schema = this.schemasById.get(match.id);
      if (schema !== undefined) {
        resolvedResults.push({
          id: match.id,
          collection: structuredClone(schema),
          score: match.score,
        });
      }
    }

    return resolvedResults;
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSchema[] {
    return this.searchWithScores(query, options).map(({ collection }) => collection);
  }

  searchWithScores(query: string, options: CollectionSearchOptions = {}): CollectionSearchResult[] {
    const matches = this.getSearchEngine().search(query);
    return this.resolveMatches(matches, options);
  }
}
