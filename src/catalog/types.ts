import type { OgcCollectionSchema } from '@/ogc-api-feature/types';
import type { CollectionSearchOptions, CollectionSearchResult } from '@/search/types';

/*
 * =============================================================================
 * Catalog API
 * =============================================================================
 */

export interface CollectionCatalog {
  list(): OgcCollectionSchema[];
  getById(id: string): OgcCollectionSchema | undefined;
  search(query: string, options?: CollectionSearchOptions): OgcCollectionSchema[];
  searchWithScores(query: string, options?: CollectionSearchOptions): CollectionSearchResult[];
}
