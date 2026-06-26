import type { OgcCollectionBrief } from '@/ogc-api-feature/types';
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
 * - it renders them once as public CollectionBrief objects
 * - it optionally delegates query ranking to a search engine
 */
export class InMemoryCollectionCatalog implements CollectionCatalog {

  private readonly collections: EnrichedCollection[];
  private readonly briefsById: Map<string, OgcCollectionBrief>;
  private readonly searchEngine: CollectionSearchEngine;

  constructor(collections: EnrichedCollection[], searchEngine: CollectionSearchEngine) {
    this.collections = collections;

    // Render the public brief view once at construction time and keep it
    // indexed by collection id for later lookup and search result resolution.
    this.briefsById = new Map(
      collections.map((collection) => [collection.id, {
        id: collection.id,
        title: collection.title,
        description: collection.description,
      }])
    );

    this.searchEngine = searchEngine;
  }

  list(): OgcCollectionBrief[] {
    return this.collections.map((collection) => structuredClone(this.briefsById.get(collection.id)!));
  }

  getById(id: string): OgcCollectionBrief | undefined {
    const brief = this.briefsById.get(id);
    return brief ? structuredClone(brief) : undefined;
  }

  search(query: string, options: CollectionSearchOptions = {}): OgcCollectionBrief[] {
    const briefs: OgcCollectionBrief[] = [];

    for (const match of this.searchWithScores(query, options)) {
      const brief = this.getById(match.id);
      if (! brief) {
        throw new Error(`Indexed collection "${match.id}" not found in the catalog!`);
      }
      briefs.push(brief);
    }

    return briefs;
  }

  searchWithScores(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    return this.searchEngine.search(query, options);
  }

}
