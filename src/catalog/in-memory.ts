import type { OgcCollectionBrief, OgcCollectionSchema } from '@/ogc-api-feature/types';
import { renderCollectionBrief, renderCollectionSchema } from '@/ogc-api-feature/writer';
import type { EnrichedCollection } from '@/pivot/types';
import type { CollectionSearchEngine, CollectionSearchMatch, CollectionSearchOptions } from '@/search/types';
import type { CollectionCatalog } from './types';

/*
 * =============================================================================
 * In-memory catalog implementation
 * =============================================================================
 */

/**
 * The catalog is the public in-memory view exposed to callers:
 * - it stores internal EnrichedCollection inputs
 * - it renders them once as public CollectionBrief and CollectionSchema objects
 * - it optionally delegates query ranking to a search engine
 */
export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: EnrichedCollection[];
  private readonly briefsById: Map<string, OgcCollectionBrief>;
  private readonly schemasById: Map<string, OgcCollectionSchema>;
  private readonly searchEngine: CollectionSearchEngine;

  constructor(collections: EnrichedCollection[], searchEngine: CollectionSearchEngine) {
    this.collections = collections;

    // Render the public brief view once at construction time and keep it
    // indexed by collection id for later lookup and search result resolution.
    this.briefsById = new Map(
      collections.map((collection) => [collection.id, renderCollectionBrief(collection)])
    );

    this.schemasById = new Map(
      collections.map((collection) => [collection.id, renderCollectionSchema(collection)])
    );

    this.searchEngine = searchEngine;
  }

  list(): OgcCollectionBrief[] {
    return this.collections.map((collection) => structuredClone(this.briefsById.get(collection.id)!));
  }

  getById(id: string): OgcCollectionSchema | undefined {
    const schema = this.schemasById.get(id);
    return schema ? structuredClone(schema) : undefined;
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    return this.searchEngine.search(query, options);
  }

}

