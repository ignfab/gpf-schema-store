import type { Collection } from "./types";
import { loadCollections } from "./services/storage";

export function getCollections(): Collection[] {
    return structuredClone(loadCollections());
}
