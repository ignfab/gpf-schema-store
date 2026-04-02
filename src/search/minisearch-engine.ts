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
    enums?: number;
  };
  fuzzy?: number;
};

type ResolvedMiniSearchCollectionSearchEngineOptions = {
  boost: {
    namespace: number;
    name: number;
    title: number;
    description: number;
    properties: number;
    enums: number;
  };
  fuzzy: number;
};

const DEFAULT_MINISEARCH_OPTIONS: ResolvedMiniSearchCollectionSearchEngineOptions = {
  boost: {
    namespace: 5.0,
    name: 4.0,
    title: 2.0,
    description: 1.5,
    properties: 1.3,
    enums: 1.8,
  },
  fuzzy: 0.1,
};

// A virtual field added to each document before indexing so MiniSearch can index enum values separately.
type IndexedCollection = Collection & { enumValues: string };

function stringifyProperties(properties: CollectionProperty[]): string {
  const terms = properties
    .flatMap((p) => [p.name, p.title])
    .filter(Boolean);
  return terms.join(' ');
}

function stringifyEnumValues(properties: CollectionProperty[]): string {
  const values = properties
    .flatMap((p) => p.enum ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return [...new Set(values)].join(' ');
}

export class MiniSearchCollectionSearchEngine implements CollectionSearchEngine {

  private readonly miniSearch: MiniSearch<IndexedCollection>;
  private readonly options: ResolvedMiniSearchCollectionSearchEngineOptions;

  constructor(
    collections: Collection[],
    options: MiniSearchCollectionSearchEngineOptions = {},
  ) {

    this.options = {
      boost: { ...DEFAULT_MINISEARCH_OPTIONS.boost, ...options.boost },
      fuzzy: options.fuzzy ?? DEFAULT_MINISEARCH_OPTIONS.fuzzy,
    };

    this.miniSearch = new MiniSearch<IndexedCollection>({
      idField: 'id',
      fields: ['namespace', 'name', 'title', 'description', 'properties', 'enumValues'],
      stringifyField: (fieldValue, fieldName) => {
        if (fieldName === 'properties') {
          return stringifyProperties(fieldValue as CollectionProperty[]);
        }
        return String(fieldValue);
      },
    });

    const documents: IndexedCollection[] = collections.map((c) => ({
      ...c,
      enumValues: stringifyEnumValues(c.properties),
    }));
    this.miniSearch.addAll(documents);
  }

  search(query: string, options: CollectionSearchOptions = {}): CollectionSearchMatch[] {
    return this.miniSearch
      .search(query, {
        boost: {
          namespace: this.options.boost.namespace,
          name: this.options.boost.name,
          title: this.options.boost.title,
          description: this.options.boost.description,
          properties: this.options.boost.properties,
          enumValues: this.options.boost.enums,
        },
        fuzzy: this.options.fuzzy,
        combineWith: options.combineWith,
        fields: options.fields,
      })
      .map((result) => ({ id: result.id as string, score: result.score }));
  }
}
