import type { Collection } from '../types';

export type CollectionSearchOptions = {
  limit?: number;
  fields?: string[];
  combineWith?: 'AND' | 'OR';
};

export type CollectionSearchMatch = {
  id: string;
  score?: number;
};

export interface CollectionSearchEngine {
  search(query: string, options?: CollectionSearchOptions): CollectionSearchMatch[];
}

export type CollectionSearchEngineFactory = (collections: Collection[]) => CollectionSearchEngine;
