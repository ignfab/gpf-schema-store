import type { CollectionCatalog } from "./search/catalog";
import type { CollectionSearchEngine } from "./search/types";
import type { MiniSearchCollectionSearchOptions } from "./search/minisearch-engine";
import type { CollectionSchema } from "./types";
import { loadEnrichedCollections } from "./enrichment/load-enriched-collections";
import { InMemoryCollectionCatalog } from "./search/catalog";
import { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";
import { renderCollectionSchema } from "./renderers/collection-schema";

export type {
    CollectionSchema,
    CollectionSchemaProperty,
    CollectionSchemaValue,
} from "./types";
export type { CollectionCatalog } from "./search/catalog";
export type {
    CollectionSearchEngine,
    CollectionSearchMatch,
    CollectionSearchResult,
    CollectionSearchOptions,
} from "./search/types";
export type { MiniSearchCollectionSearchOptions } from "./search/minisearch-engine";

export type CollectionCatalogOptions =
    | { engine: CollectionSearchEngine; miniSearch?: never }
    | { miniSearch: MiniSearchCollectionSearchOptions; engine?: never }
    | { engine?: never; miniSearch?: never };

// Returns the full public catalog as a plain array of rendered JSON Schemas.
// Use this when the caller wants a snapshot of every collection and does not
// need lookup or search capabilities.
export function getCollections(): CollectionSchema[] {
    return loadEnrichedCollections().map((collection) => renderCollectionSchema(collection));
}

// Returns a catalog service built from the same underlying collections.
// Unlike getCollections(), this keeps catalog-specific behavior such as
// getById(), search(), and searchWithScores(), and wires MiniSearch by default.
export function getCollectionCatalog(
    options: CollectionCatalogOptions = {},
): CollectionCatalog {
    const collections = loadEnrichedCollections();

    if ("engine" in options && options.engine) {
        return new InMemoryCollectionCatalog(collections, {
            engine: options.engine,
        });
    }

    return new InMemoryCollectionCatalog(collections, {
        engineFactory: (items) => new MiniSearchCollectionSearchEngine(items, {
            defaultSearchOptions: options.miniSearch,
        }),
    });
}
