import MiniSearch from 'minisearch';
import type { Collection, CollectionProperty } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
  CollectionSearchOptions,
} from './types';

// Options for MiniSearch are based on the SearchOptions type defined in the MiniSearch library
// https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html gives list of all options
export type MiniSearchCollectionSearchEngineOptions = {
  boost?: {
    namespace?: number;
    name?: number;
    title?: number;
    description?: number;
    properties?: number;
  };
  fuzzy?: number;
};

const DEFAULT_MINISEARCH_OPTIONS: Required<MiniSearchCollectionSearchEngineOptions> = {
  boost: {
    namespace: 5.0,
    name: 4.0,
    title: 2.0,
    description: 1.5,
    properties: 1.3,
  },
  fuzzy: 0.1,
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
        'namespace',
        'name',
        'title',
        'description',
        'properties',
      ],
      stringifyField: (fieldValue, fieldName) => {
        if (fieldName === 'properties') {
          return (fieldValue as CollectionProperty[])
            .flatMap((p) => [p.name, p.title])
            .filter(Boolean)
            .join(' ');
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
