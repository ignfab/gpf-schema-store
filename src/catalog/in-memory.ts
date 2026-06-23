import type { OgcCollectionSchema } from '@/ogc-api-feature/types';
import { renderCollectionSchema } from '@/ogc-api-feature/writer';
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
 * - it renders them once as public CollectionSchema objects
 * - it optionally delegates query ranking to a search engine
 */
export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: EnrichedCollection[];
  private readonly schemasById: Map<string, OgcCollectionSchema>;
  private readonly searchEngine: CollectionSearchEngine;

  constructor(collections: EnrichedCollection[], searchEngine: CollectionSearchEngine) {
    this.collections = collections;

    // Render the public schema view once at construction time and keep it
    // indexed by collection id for later lookup and search result resolution.
    this.schemasById = new Map(
      collections.map((collection) => [collection.id, renderCollectionSchema(collection)])
    );

    this.searchEngine = searchEngine;
  }

  list(): OgcCollectionSchema[] {
    return this.collections.map((collection) => structuredClone(this.schemasById.get(collection.id)!));
  }

  getById(id: string): OgcCollectionSchema | undefined {
    const schema = this.schemasById.get(id);
    return schema ? structuredClone(schema) : undefined;
  }

  search(query: string, options: CollectionSearchOptions = {}): OgcCollectionSchema[] {
    const schemas: OgcCollectionSchema[] = [];

    for (const match of this.searchWithScores(query, options)) {
      const schema = this.getById(match.id);
      if (! schema) {
        throw new Error(`Indexed collection "${match.id}" not found in the catalog!`);
      }
      schemas.push(schema);
    }

    return schemas;
  }

  searchWithScores(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    const matches = this.searchEngine.search(query);
    return options.limit ? matches.slice(0,options.limit) : matches;
  }

}
