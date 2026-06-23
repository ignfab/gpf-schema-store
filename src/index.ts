import type { CollectionCatalog } from './catalog/types';
import type { MiniSearchCollectionSearchOptions } from "./search/minisearch-engine";
import { loadEnrichedCollections } from "./enrichment/load-enriched-collections";
import { InMemoryCollectionCatalog } from './catalog/in-memory';
import { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";
import type { CollectionSearchEngine } from './search/types';

/*
 * ============================================================================
 * Public API for MCP geocontext integration
 * ============================================================================
 */

export type {
    OgcCollectionSchema,
    OgcCollectionProperty,
    OgcCollectionPropertyEnumValue,
} from "./ogc-api-feature/types";

export {
    zOgcCollectionSchema
} from "./ogc-api-feature/types";

export type { CollectionCatalog } from "./catalog/types";
export type {
    CollectionSearchEngine,
    CollectionSearchMatch,
    CollectionSearchResult,
    CollectionSearchOptions,
} from "./search/types";

export type { MiniSearchCollectionSearchOptions } from "./search/minisearch-engine";

/**
 * Allows to configure miniSearch or to provide a custom searchEngine (mutually exclusive)
 */
export type CollectionCatalogOptions = {
    miniSearch?: MiniSearchCollectionSearchOptions;
    searchEngine?: CollectionSearchEngine;
};

/**
 * Returns a CollectionCatalog built from the enriched collections using
 * MiniSearch as the default search engine.
 */
export function getCollectionCatalog(
    options: CollectionCatalogOptions = {},
): CollectionCatalog {
    if (options.miniSearch && options.searchEngine) {
        throw new Error(
            "miniSearch and searchEngine options are mutually exclusive: provide at most one.",
        );
    }

    const collections = loadEnrichedCollections();

    const searchEngine =
        options.searchEngine ??
        new MiniSearchCollectionSearchEngine(collections, {
            defaultSearchOptions: options.miniSearch,
        });

    return new InMemoryCollectionCatalog(collections, searchEngine);
}
