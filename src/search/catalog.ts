import type { Collection } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchEngineFactory,
  CollectionSearchOptions,
} from './types';

export interface CollectionCatalog {
  list(): Collection[];
  getById(id: string): Collection | undefined;
  search(query: string, options?: CollectionSearchOptions): Collection[];
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

  search(query: string, options: CollectionSearchOptions = {}): Collection[] {
    if (!this.searchEngine) {
      throw new Error('No search engine configured');
    }

    const matches = this.searchEngine.search(query, options);

    const collections: Collection[] = [];
    // Keep the search-engine ranking order while resolving IDs to collections.
    for (const match of matches) {
      const collection = this.byId.get(match.id);
      if (collection !== undefined) {
        collections.push(collection);
      }
    }

    const limit = options.limit;
    if (typeof limit === 'number' && limit >= 0) {
      return structuredClone(collections.slice(0, limit));
    }

    return structuredClone(collections);
  }
}
