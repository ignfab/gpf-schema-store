import { loadCollections } from "./services/storage";
import { InMemoryCollectionCatalog } from "./search/catalog";
import { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";

export type Collection = import("./types").Collection;
export type CollectionProperty = import("./types").CollectionProperty;
export type {
  CollectionCatalog,
  InMemoryCollectionCatalogOptions as CollectionCatalogOptions,
} from "./search/catalog";
export type {
  CollectionSearchEngine,
  CollectionSearchEngineFactory,
  CollectionSearchMatch,
  CollectionSearchOptions,
} from "./search/types";
export { InMemoryCollectionCatalog } from "./search/catalog";
export { MiniSearchCollectionSearchEngine } from "./search/minisearch-engine";

export function getCollections(): Collection[] {
    return structuredClone(loadCollections());
}

export function getCollectionCatalog(
    options: import("./search/catalog").InMemoryCollectionCatalogOptions = {},
): import("./search/catalog").CollectionCatalog {
    const collections = loadCollections();
    return new InMemoryCollectionCatalog(collections, {
        engineFactory: (items) => new MiniSearchCollectionSearchEngine(items),
        ...options,
    });
}
