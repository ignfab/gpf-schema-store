import type { Collection } from "./types";

const collections = getCollections();

export function getCollections(): Promise<Collection[]> {
    return collections;
}
