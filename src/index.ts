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
    OgcCollectionBrief,
    OgcCollectionSchema,
    OgcCollectionProperty,
    OgcCollectionPropertyEnumValue,
} from "./ogc-api-feature/types";

export {
    zOgcCollectionBrief,
    zOgcCollectionSchema
} from "./ogc-api-feature/types";

export type { CollectionCatalog } from "./catalog/types";
export type {
    CollectionSearchEngine,
    CollectionSearchMatch,
    CollectionSearchOptions,
} from "./search/types";

export type { MiniSearchCollectionSearchOptions } from "./search/minisearch-engine";

/**
 * Allows to configure miniSearch or to provide a custom searchEngine (mutually exclusive)
 */
export type CollectionCatalogOptions =
    | { searchEngine: CollectionSearchEngine; miniSearch?: never }
    | { miniSearch: MiniSearchCollectionSearchOptions; searchEngine?: never }
    | { searchEngine?: never; miniSearch?: never };

/**
 * Returns a CollectionCatalog built from the enriched collections using
 * MiniSearch as the default search engine.
 */
export function getCollectionCatalog(
    options: CollectionCatalogOptions = {},
): CollectionCatalog {
    const collections = loadEnrichedCollections();

    const searchEngine =
        options.searchEngine ??
        new MiniSearchCollectionSearchEngine(collections, {
            defaultSearchOptions: options.miniSearch,
        });

    return new InMemoryCollectionCatalog(collections, searchEngine);
}
