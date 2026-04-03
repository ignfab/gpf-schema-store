import MiniSearch, { type MatchInfo } from 'minisearch';
import type { Collection, CollectionProperty } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
} from './types';

const INDEXED_COLLECTION_FIELDS = [
  'namespace',
  'name',
  'title',
  'description',
  'properties',
  'enums',
  'identifierTokens',
] as const;

type IndexedCollectionField = typeof INDEXED_COLLECTION_FIELDS[number];

// Options for MiniSearch are based on the SearchOptions type defined in the MiniSearch library
// https://lucaong.github.io/minisearch/types/MiniSearch.SearchOptions.html gives list of all options
export type MiniSearchCollectionSearchOptions = {
  fields?: IndexedCollectionField[];
  combineWith?: 'AND' | 'OR';
  boost?: {
    namespace?: number;
    name?: number;
    title?: number;
    description?: number;
    properties?: number;
    enums?: number;
    identifierTokens?: number;
  };
  fuzzy?: number;
};

export type MiniSearchCollectionSearchEngineOptions = {
  defaultSearchOptions?: MiniSearchCollectionSearchOptions;
};

export type MiniSearchCollectionSearchMatch = CollectionSearchMatch & {
  queryTerms?: string[];
  terms?: string[];
  match?: MatchInfo;
};

// All boost fields present and required (no optional keys) — used for the resolved default options.
type ResolvedBoost = Required<NonNullable<MiniSearchCollectionSearchOptions['boost']>>;

// Baseline search behaviour applied when the caller does not provide overrides.
const DEFAULT_MINISEARCH_SEARCH_OPTIONS: { boost: ResolvedBoost; fuzzy: number } = {
  boost: {
    namespace: 5.0,
    name: 4.0,
    identifierTokens: 3.0,
    title: 2.0,
    description: 1.5,
    properties: 1.3,
    enums: 1.8,
  },
  fuzzy: 0.1,
};

// A virtual field added to each document before indexing so MiniSearch can index enum values separately.
type IndexedCollection = Collection & {
  enums: string;
  identifierTokens: string;
};

export class MiniSearchCollectionSearchEngine implements CollectionSearchEngine {

  private readonly miniSearch: MiniSearch<IndexedCollection>;

  // Resolved at construction time by merging defaults with the caller-supplied options.
  private readonly defaultSearchOptions: { fields?: IndexedCollectionField[]; combineWith?: 'AND' | 'OR'; boost: ResolvedBoost; fuzzy: number };

  // Normalizes a search term: lowercases, strips accents (é→e, â→a), and trims whitespace.
  // Applied symmetrically at indexing and search time so queries and indexed terms always match.
  // Returns false to discard empty tokens (e.g. caused by extra spaces in the query).
  private static normalizeTerm(term: string): string | false {
    const normalized = term
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
    return normalized.length > 0 ? normalized : false;
  }

  // Produces a single string from property names, titles, and descriptions for MiniSearch to tokenize.
  private static stringifyProperties(properties: CollectionProperty[]): string {
    const terms = properties
      .flatMap((p) => [p.name, p.title, p.description])
      .filter(Boolean);
    return terms.join(' ');
  }

  // Produces a string that includes both raw identifiers (id, namespace, name) and their
  // expanded forms with separators (_:./-) replaced by spaces, so that partial queries like
  // "troncon route" match "troncon_de_route".
  private static stringifyIdentifierTokens(collection: Collection): string {
    const rawValues = [collection.id, collection.namespace, collection.name];
    const expandedValues = rawValues.map((value) => value.replace(/[_:./-]+/g, ' '));
    return [...rawValues, ...expandedValues].join(' ');
  }

  // Produces a deduplicated string of normalized enum values so that duplicate entries
  // (e.g. 'Viaduc', 'viaduc') don't inflate match scores.
  private static stringifyEnumValues(properties: CollectionProperty[]): string {
    const values = properties
      .flatMap((p) => p.enum ?? [])
      .map((value) => MiniSearchCollectionSearchEngine.normalizeTerm(value))
      .filter((value): value is string => value !== false);
    return [...new Set(values)].join(' ');
  }

  constructor(
    collections: Collection[],
    options: MiniSearchCollectionSearchEngineOptions = {},
  ) {
    const defaultSearchOptions = options.defaultSearchOptions ?? {};
    this.defaultSearchOptions = {
      fields: defaultSearchOptions.fields,
      combineWith: defaultSearchOptions.combineWith,
      boost: {
        ...DEFAULT_MINISEARCH_SEARCH_OPTIONS.boost,
        ...defaultSearchOptions.boost,
      },
      fuzzy: defaultSearchOptions.fuzzy ?? DEFAULT_MINISEARCH_SEARCH_OPTIONS.fuzzy,
    };

    // Configure MiniSearch: which fields to index and how to stringify non-string fields.
    // processTerm is applied to every token at both indexing and search time.
    this.miniSearch = new MiniSearch<IndexedCollection>({
      idField: 'id',
      fields: [...INDEXED_COLLECTION_FIELDS],
      processTerm: MiniSearchCollectionSearchEngine.normalizeTerm,
      stringifyField: (fieldValue, fieldName) => {
        if (fieldName === 'properties') {
          return MiniSearchCollectionSearchEngine.stringifyProperties(fieldValue as CollectionProperty[]);
        }
        return String(fieldValue);
      },
    });

    // Pre-compute the enums string for each document before adding it to the index.
    const documents: IndexedCollection[] = collections.map((c) => ({
      ...c,
      enums: MiniSearchCollectionSearchEngine.stringifyEnumValues(c.properties),
      identifierTokens: MiniSearchCollectionSearchEngine.stringifyIdentifierTokens(c),
    }));
    this.miniSearch.addAll(documents);
  }

  search(
    query: string,
    options: MiniSearchCollectionSearchOptions = {},
  ): CollectionSearchMatch[] {
    return this.searchDetailed(query, options).map(({ id, score }) => ({ id, score }));
  }

  searchDetailed(
    query: string,
    options: MiniSearchCollectionSearchOptions = {},
  ): MiniSearchCollectionSearchMatch[] {
    // Per-query options override the defaults; boost fields are merged so callers can
    // adjust individual weights without specifying all of them.
    return this.miniSearch
      .search(query, {
        fields: options.fields ?? this.defaultSearchOptions.fields,
        combineWith: options.combineWith ?? this.defaultSearchOptions.combineWith,
        boost: { ...this.defaultSearchOptions.boost, ...options.boost },
        fuzzy: options.fuzzy ?? this.defaultSearchOptions.fuzzy,
      })
      .map((result) => ({
        id: result.id as string,
        score: result.score,
        queryTerms: result.queryTerms,
        terms: result.terms,
        match: result.match,
      }));
  }

  getDefaultSearchOptions(): MiniSearchCollectionSearchOptions {
    return structuredClone(this.defaultSearchOptions);
  }
}
