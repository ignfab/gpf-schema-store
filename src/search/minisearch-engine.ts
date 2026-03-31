import MiniSearch from 'minisearch';
import type { Collection } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
  CollectionSearchOptions,
} from './types';

// Options for MiniSearch are based on the SearchOptions type defined in the MiniSearch library
// https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html gives list of all options
export type MiniSearchCollectionSearchEngineOptions = {
  boost?: {
    id?: number;
    namespace?: number;
    title?: number;
    description?: number;
    properties?: number;
  };
  fuzzy?: number;
};

const DEFAULT_MINISEARCH_OPTIONS: Required<MiniSearchCollectionSearchEngineOptions> = {
  boost: {
    id: 3.0,
    namespace: 5.0,
    title: 2.0,
    description: 1.5,
    properties: 1.3,
  },
  fuzzy: 0.2,
};

export class MiniSearchCollectionSearchEngine implements CollectionSearchEngine {
  private readonly miniSearch: MiniSearch<Collection>;
  private readonly options: Required<MiniSearchCollectionSearchEngineOptions>;

  constructor(
    collections: Collection[],
    options: MiniSearchCollectionSearchEngineOptions = {},
  ) {
    this.options = {
      boost: { ...DEFAULT_MINISEARCH_OPTIONS.boost, ...options.boost },
      fuzzy: options.fuzzy ?? DEFAULT_MINISEARCH_OPTIONS.fuzzy,
    };

    this.miniSearch = new MiniSearch<Collection>({
      idField: 'id',
      fields: [
        'id',
        'namespace',
        'name',
        'title',
        'description',
        'properties',
      ],
      stringifyField: (fieldValue, fieldName) => {
        if (fieldName === 'properties') {
          return JSON.stringify(fieldValue);
        }
        return String(fieldValue);
      },
    });

    this.miniSearch.addAll(collections);
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    const results = this.miniSearch.search(query, {
      boost: this.options.boost,
      fuzzy: this.options.fuzzy,
      combineWith: options.combineWith,
      fields: options.fields,
    });

    const matches = results.map((result) => ({
      id: result.id as string,
      score: result.score,
    }));

    return matches;
  }
}
