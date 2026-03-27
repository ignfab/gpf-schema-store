import { loadCollections } from "./services/storage";
export type Collection = import("./types").Collection;
export type CollectionProperty = import("./types").CollectionProperty;

export function getCollections(): Collection[] {
    return structuredClone(loadCollections());
}
