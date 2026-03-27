import { dirname, join } from "path";
import type { Collection } from "../types";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

/**
 * The name of the resulting file
 * 
 * Note that this storage mode is here to avoid the use
 * of a database during the proof of concept.
 */
const COLLECTIONS_FILE = "gpf-collections.json";

/**
 * Allows to resolve the data directory from the current file before 
 * and after bundling with Vite.
 *
 * @returns The data directory
 */
function resolveDataDir(): string {
    let dir = dirname(fileURLToPath(import.meta.url));
    const start = dir;
    while (true) {
        for (const candidate of [join(dir, "data"), join(dir, "src", "data")]) {
            if (existsSync(join(candidate, COLLECTIONS_FILE))) {
                return candidate;
            }
        }
        if (existsSync(join(dir, "package.json"))) {
            return join(dir, "data");
        }
        const parent = dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    throw new Error(`Could not resolve data directory (started from ${start})`);
}

/**
 * The directory where the collections and overwritesare stored
 */
const DATA_DIR = resolveDataDir();


/**
 * Load the collections from the GPF collections file
 * 
 * (data/gpf-collections.json)
 * 
 * @returns The collections from the GPF collections file
 */
export function loadCollections(): Collection[] {
    const collectionsPath = join(DATA_DIR, 'gpf-collections.json');
    if (existsSync(collectionsPath)) {
        return JSON.parse(readFileSync(collectionsPath, 'utf-8')) as Collection[];
    }
    return [];
}

/**
 * Save the collections to the GPF collections file
 * 
 * (data/gpf-collections.json)
 * 
 * @param collections - The collections to save
 */
export function saveCollections(collections: Collection[]): void {
    const collectionsPath = join(DATA_DIR, 'gpf-collections.json');
    writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
}

/**
 * Get the overwrite for a collection if it exists
 * 
 * (data/overwrites/{namespace}/{name}.json)
 * 
 * @param namespace - The namespace of the collection
 * @param name - The name of the collection
 * @returns The overwrite for the collection if it exists, null otherwise
 */
export function getOverwrite(namespace: string, name: string): Collection | null {
    const overwritePath = join(DATA_DIR, 'overwrites', namespace, `${name}.json`);
    if (existsSync(overwritePath)) {
        return JSON.parse(readFileSync(overwritePath, 'utf-8')) as Collection;
    }
    return null;
}

