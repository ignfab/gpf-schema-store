import type { OgcCollectionBrief } from '@/ogc-api-feature/types';
import type { CollectionSearchOptions, CollectionSearchMatch } from '@/search/types';

/*
 * =============================================================================
 * Catalog API
 * =============================================================================
 */

export interface CollectionCatalog {
  /**
   * List collections
   * 
   * Expected as "GET /collections"
   */
  list(): OgcCollectionBrief[];

  /**
   * Get collection schema by id
   * 
   * Expected as "GET /collections/{id}/schema"
   */
  getById(id: string): OgcCollectionBrief | undefined;

  /**
   * Search collection by keyword
   * 
   * Expected as "GET /collections?q={query}" at GPF level
   */
  search(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}
