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

  private readonly briefs: OgcCollectionBrief[];
  private readonly schemasById: Map<string, OgcCollectionSchema>;
  private readonly searchEngine: CollectionSearchEngine;

  constructor(collections: EnrichedCollection[], searchEngine: CollectionSearchEngine) {
    // Render the public brief view once at construction time.
    this.briefs = collections.map((collection) => renderCollectionBrief(collection));

    this.schemasById = new Map(
      collections.map((collection) => [collection.id, renderCollectionSchema(collection)])
    );

    this.searchEngine = searchEngine;
  }

  list(): OgcCollectionBrief[] {
    return this.briefs.map((brief) => structuredClone(brief));
  }

  getById(id: string): OgcCollectionSchema | undefined {
    const schema = this.schemasById.get(id);
    return schema ? structuredClone(schema) : undefined;
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    return this.searchEngine.search(query, options);
  }

}

