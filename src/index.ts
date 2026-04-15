import type { CollectionCatalog, InMemoryCollectionCatalogOptions as CollectionCatalogOptions } from "./search/catalog";
import type { Collection } from "./types";
import { loadCollections } from "./services/storage";
import { InMemoryCollectionCatalog } from "./search/catalog";
import { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";

export type { Collection, CollectionProperty, CollectionPropertyType } from "./types";
export type {
    CollectionCatalog,
    InMemoryCollectionCatalogOptions as CollectionCatalogOptions,
} from "./search/catalog";
export type {
    CollectionSearchEngine,
    CollectionSearchEngineFactory,
    CollectionSearchMatch,
    CollectionSearchResult,
    CollectionSearchOptions,
} from "./search/types";
export type {
    MiniSearchCollectionSearchEngineOptions,
    MiniSearchCollectionSearchMatch,
    MiniSearchCollectionSearchOptions,
} from "./search/minisearch-engine";
export { InMemoryCollectionCatalog } from "./search/catalog";
export { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";

export function getCollections(): Collection[] {
    return structuredClone(loadCollections());
}

export function getCollectionCatalog(
    options: CollectionCatalogOptions = {},
): CollectionCatalog {
    const collections = loadCollections();
    // Default to MiniSearch when no engine is provided by the caller.
    if (!options.engine && !options.engineFactory) {
        return new InMemoryCollectionCatalog(collections, {
            engineFactory: (items) => new MiniSearchCollectionSearchEngine(items),
        });
    }
    return new InMemoryCollectionCatalog(collections, options);
}
