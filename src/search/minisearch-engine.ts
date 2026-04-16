import MiniSearch, { type MatchInfo } from 'minisearch';
import type { Collection, CollectionProperty } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
} from './types';

// Virtual fields indexed by MiniSearch for each collection.
//
// | Field               | Source                          | Content                                                       |
// |---------------------|---------------------------------|---------------------------------------------------------------|
// | namespace           | Collection.namespace (WFS)      | Raw namespace string                                          |
// | name                | Collection.name (WFS)           | Raw name string                                               |
// | title               | Collection.title (overwrite)    | Raw title string                                              |
// | description         | Collection.description (ow)     | Raw description string                                        |
// | properties          | CollectionProperty[] (merged)   | name + title + description of each property (stringified)     |
// | allowedValues       | virtual (computed)              | AllowedValue.value terms only                                 |
// | representedFeatures | virtual (computed)              | Collection + AllowedValue representedFeatures terms           |
// | selectionCriteria   | virtual (computed)              | Collection.selectionCriteria terms                            |
// | identifierTokens    | virtual (computed)              | id, namespace, name with separators expanded to spaces        |
//
// The enriched overwrite fields are deliberately split across several virtual
// fields so that broad documentary text does not carry the same weight as
// short, controlled vocabulary terms. AllowedValue.description and
// AllowedValue.availableWhen are not indexed: descriptions are too noisy for
// collection-level search, and availableWhen is a conditional constraint.
//
const INDEXED_COLLECTION_FIELDS = [
  'namespace',
  'name',
  'title',
  'description',
  'properties',
  'allowedValues',
  'representedFeatures',
  'selectionCriteria',
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
    allowedValues?: number;
    representedFeatures?: number;
    selectionCriteria?: number;
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
    allowedValues: 1.6,
    representedFeatures: 1.8,
    selectionCriteria: 0.4,
  },
  fuzzy: 0.1,
};

// An augmented collection with pre-computed string fields for MiniSearch indexing.
// - allowedValues: a string made only from AllowedValue.value entries.
// - representedFeatures: a string made from collection-level and allowed-value-level representedFeatures.
// - selectionCriteria: a low-boost string made from the collection selection criteria.
// - identifierTokens: a single string with expanded identifier tokens for partial matching
type IndexedCollection = Omit<Collection, 'representedFeatures' | 'selectionCriteria'> & {
  allowedValues: string;
  representedFeatures: string;
  selectionCriteria: string;
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

  // Normalizes and deduplicates phrase-level values before MiniSearch tokenizes them.
  // This avoids duplicate source entries such as "Viaduc" and " viaduc " inflating scores.
  private static stringifySearchTerms(values: Array<string | undefined>): string {
    const terms = values
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => MiniSearchCollectionSearchEngine.normalizeTerm(value))
      .filter((value): value is string => value !== false);

    return [...new Set(terms)].join(' ');
  }

  // Produces a searchable string from allowed-value names only.
  // Descriptions are intentionally not indexed because they add long documentary text
  // without preserving the link to the value they describe in a collection-level index.
  private static stringifyAllowedValues(collection: Collection): string {
    const values = collection.properties
      .flatMap((p) => p.allowedValues ?? [])
      .map((av) => av.value);

    return MiniSearchCollectionSearchEngine.stringifySearchTerms(values);
  }

  // Produces a searchable string from short business vocabulary describing what
  // the collection or its allowed values represent.
  private static stringifyRepresentedFeatures(collection: Collection): string {
    const values = [
      ...(collection.representedFeatures ?? []),
      ...collection.properties
        .flatMap((p) => p.allowedValues ?? [])
        .flatMap((av) => av.representedFeatures ?? []),
    ];

    return MiniSearchCollectionSearchEngine.stringifySearchTerms(values);
  }

  // Produces a low-boost searchable string from broad collection selection rules.
  private static stringifySelectionCriteria(collection: Collection): string {
    return MiniSearchCollectionSearchEngine.stringifySearchTerms([collection.selectionCriteria]);
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

    // Pre-compute virtual strings for each document before adding them to the index.
    const documents: IndexedCollection[] = collections.map((c) => ({
      ...c,
      allowedValues: MiniSearchCollectionSearchEngine.stringifyAllowedValues(c),
      representedFeatures: MiniSearchCollectionSearchEngine.stringifyRepresentedFeatures(c),
      selectionCriteria: MiniSearchCollectionSearchEngine.stringifySelectionCriteria(c),
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
