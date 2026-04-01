import { dirname, join } from "path";
import type { Collection, NamespaceFilterRule } from "../types";
import { fileURLToPath } from "url";
import {
    existsSync,
    mkdirSync,
    rmSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from "fs";
import { merge } from "../helpers/merge";
import { loadNamespaceFilters } from "../helpers/filter";

/**
 * Allows to resolve the data directory from the current file before 
 * and after bundling with Vite.
 *
 * @returns The data directory
 */
function resolveDataDir(): string {
    // either src/services/storage.ts or dist/services/storage.js
    let dir = dirname(fileURLToPath(import.meta.url));

    // explore the directory tree upwards until we find the data directory
    const start = dir;
    while (true) {
        const candidate = join(dir, "data");
        if (existsSync(candidate)) {
            return candidate;
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
 * The directory where the collections and overwrites are stored
 */
const DATA_DIR = resolveDataDir();

/**
 * Get the data directory
 * 
 * @returns The data directory
 */
export function getDataDir(): string {
    return DATA_DIR;
}

/**
 * Get the list of namespace filters from the data/namespace-filters.yaml file
 * 
 * @returns the list of the namespace filters
 */
export function getNamespaceFilters(): NamespaceFilterRule[] {
    const namespaceFiltersPath = join(DATA_DIR, 'namespace-filters.yaml');
    if (!existsSync(namespaceFiltersPath)) {
        throw new Error(`Could not load namespace filters: ${namespaceFiltersPath} does not exist`);
    }
    const yamlContent = readFileSync(namespaceFiltersPath, 'utf-8');
    return loadNamespaceFilters(yamlContent);
}

/**
 * Charge les collections WFS brutes en listant les fichiers JSON sous
 * `data/wfs/{namespace}/*.json`.
 *
 * @returns Les collections lues depuis le disque
 */
export function loadWfsCollections(): Collection[] {
    const wfsRoot = join(DATA_DIR, "wfs");
    if (!existsSync(wfsRoot)) {
        throw new Error(`Could not load collections: ${wfsRoot} does not exist`);
    }

    // list the namespaces from data/wfs
    const namespaces = readdirSync(wfsRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

    // Load the collections from data/wfs/{namespace}/*.json and parse them
    const collections: Collection[] = [];
    for (const namespace of namespaces) {
        const namespacePath = join(wfsRoot, namespace);
        const files = readdirSync(namespacePath)
            .filter((f) => f.endsWith(".json"))
            .sort();
        for (const file of files) {
            const filePath = join(namespacePath, file);
            collections.push(
                JSON.parse(readFileSync(filePath, "utf-8")) as Collection,
            );
        }
    }

    return collections;
}

/**
 * Load collections from data/wfs and apply optional overwrites from data/overwrites.
 *
 * @returns Collections with overwrite fields merged when available.
 */
export function loadCollections(): Collection[] {
    const collections = loadWfsCollections();

    // apply the overwrites to the collections
    const overwritenCollections = collections.map((c) => {
        const overwrite = getOverwrite(c.namespace, c.name);
        return merge(c, overwrite);
    });

    return overwritenCollections;
}

/**
 * Save collection from the GPF WFS to data/wfs/{namespace}/{name}.json
 *
 * @param collection 
 */
export function writeWfsCollection(collection: Collection): void {
    const namespaceDirPath = join(DATA_DIR, 'wfs', collection.namespace);
    if (!existsSync(namespaceDirPath)) {
        mkdirSync(namespaceDirPath, { recursive: true });
    }

    const overwritePath = join(namespaceDirPath, `${collection.name}.json`);
    writeFileSync(overwritePath, JSON.stringify(collection, null, 2));
}


/**
 * Clear all WFS collections from data/wfs.
 */
export function clearWfsCollections(): void {
    const wfsRoot = join(DATA_DIR, 'wfs');
    rmSync(wfsRoot, { recursive: true, force: true });
    mkdirSync(wfsRoot, { recursive: true });
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
