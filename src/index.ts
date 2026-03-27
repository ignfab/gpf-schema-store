import type { Collection } from "./types";
import { loadCollections } from "./services/storage";

const collections = loadCollections();

export function getCollections(): Collection[] {
    return collections;
}
