import type { OgcCollectionBrief } from '@/ogc-api-feature/types';
import type { CollectionSearchOptions, CollectionSearchMatch } from '@/search/types';

/*
 * =============================================================================
 * Catalog API
 * =============================================================================
 */

export interface CollectionCatalog {
  list(): OgcCollectionBrief[];
  getById(id: string): OgcCollectionBrief | undefined;
  search(query: string, options?: CollectionSearchOptions): OgcCollectionBrief[];
  searchWithScores(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}
