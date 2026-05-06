import MiniSearch, { type MatchInfo } from 'minisearch';
import type { EnrichedCollection } from '../types';
import {
  buildSearchDocuments,
  type SearchDocument,
} from './search-document';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
} from './types';

/*
 * =============================================================================
 * MiniSearch integration
 * =============================================================================
 *
 * This module adapts SearchDocument to MiniSearch:
 * - choose which search signals are indexed
 * - configure default search behavior
 * - expose lightweight and detailed search results
 */

/*
 * =============================================================================
 * Indexed fields
 * =============================================================================
 *
 * These are the fields MiniSearch sees after projecting an enriched collection
 * to a dedicated search document.
 */

const INDEXED_SEARCH_FIELDS = [
  'namespace',
  'name',
  'identifierTokens',
  'title',
  'description',
  'propertyNames',
  'propertyTitles',
  'propertyDescriptions',
  'oneOfConsts',
  'oneOfDescriptions',
  'representedFeatures',
  'selectionCriteria',
] as const;

type IndexedSearchField = typeof INDEXED_SEARCH_FIELDS[number];

/*
 * =============================================================================
 * Search options and defaults
 * =============================================================================
 */

// Options for MiniSearch are based on the SearchOptions type defined in the
// MiniSearch library. This type narrows them to the indexed fields exposed by
// this engine.
export type MiniSearchCollectionSearchOptions = {
  fields?: IndexedSearchField[];
  combineWith?: 'AND' | 'OR';
  boost?: Partial<Record<IndexedSearchField, number>>;
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

// Internal helper type used after merging user options with the engine defaults.
type ResolvedBoost = Required<Record<IndexedSearchField, number>>;

// Baseline search behavior applied when the caller does not provide overrides.
const DEFAULT_MINISEARCH_SEARCH_OPTIONS: { boost: ResolvedBoost; fuzzy: number } = {
  boost: {
    namespace: 2.5,
    name: 3.0,
    identifierTokens: 3.5,
    title: 4.0,
    description: 0.8,
    propertyNames: 1.8,
    propertyTitles: 2.2,
    propertyDescriptions: 1.0,
    oneOfConsts: 3.0,
    oneOfDescriptions: 0.7,
    representedFeatures: 3.8,
    selectionCriteria: 0.5,
  },
  fuzzy: 0.1,
};

/*
 * =============================================================================
 * Indexed document shape
 * =============================================================================
 *
 * MiniSearch indexes a dedicated search document rather than the storage model.
 *
 * Example with BDTOPO_V3:construction_surfacique (abridged):
 *
 * {
 *   id: "BDTOPO_V3:construction_surfacique",
 *   namespace: "BDTOPO_V3",
 *   name: "construction_surfacique",
 *   identifierTokens:
 *     "BDTOPO V3 construction surfacique",
 *   title: "Construction surfacique",
 *   description:
 *     "Ouvrage de grande surface lié au franchissement d’un obstacle par une voie de communication...",
 *   propertyNames:
 *     "cleabs nature nature_detaillee toponyme ... geometrie",
 *   propertyTitles:
 *     "Cleabs Nature Nature detaillee Toponyme ... Geometrie",
 *   propertyDescriptions:
 *     "Identifiant unique de l'objet. Nature de la construction. ...",
 *   oneOfConsts:
 *     "Barrage Cale Dalle Ecluse Escalier Pont ...",
 *   oneOfDescriptions:
 *     "Grand barrage en maçonnerie apparente. Plan incliné destiné ...",
 *   representedFeatures:
 *     "Cale seche Cale de lancement de navires Forme de radoub ...",
 *   selectionCriteria:
 *     "Voir les différentes valeurs de l'attribut 'Nature'.",
 * }
 */

/*
 * =============================================================================
 * Engine implementation
 * =============================================================================
 */

export class MiniSearchCollectionSearchEngine implements CollectionSearchEngine {

  private readonly miniSearch: MiniSearch<SearchDocument>;

  // Resolved once at construction time by merging defaults with caller options.
  private readonly defaultSearchOptions: { fields?: IndexedSearchField[]; combineWith?: 'AND' | 'OR'; boost: ResolvedBoost; fuzzy: number };

  /*
   * ---------------------------------------------------------------------------
   * Text normalization helpers
   * ---------------------------------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------------------------------
   * Construction and indexing
   * ---------------------------------------------------------------------------
   */

  constructor(
    collections: EnrichedCollection[],
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

    // Configure MiniSearch itself:
    // - which document fields are indexed
    // - how non-string fields are stringified
    // - how every token is normalized at both index and query time
    this.miniSearch = new MiniSearch<SearchDocument>({
      idField: 'id',
      fields: [...INDEXED_SEARCH_FIELDS],
      processTerm: MiniSearchCollectionSearchEngine.normalizeTerm,
    });

    // Project enriched collections to stable search documents before indexing.
    const documents = buildSearchDocuments(collections);
    this.miniSearch.addAll(documents);
  }

  /*
   * ---------------------------------------------------------------------------
   * Query execution
   * ---------------------------------------------------------------------------
   */

  search(
    query: string,
    options: MiniSearchCollectionSearchOptions = {},
  ): CollectionSearchMatch[] {
    // The generic search API exposes only id and score.
    return this.searchDetailed(query, options).map(({ id, score }) => ({ id, score }));
  }

  searchDetailed(
    query: string,
    options: MiniSearchCollectionSearchOptions = {},
  ): MiniSearchCollectionSearchMatch[] {
    // Per-query options override the defaults. Boost fields are merged so
    // callers can tune a single field weight without redefining every weight.
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

  // Exposed mainly for debugging, CLI output, and tests.
  getDefaultSearchOptions(): MiniSearchCollectionSearchOptions {
    return structuredClone(this.defaultSearchOptions);
  }
}
