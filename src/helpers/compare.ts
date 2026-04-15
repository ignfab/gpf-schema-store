import type { Collection, CollectionOverwrite } from "../types";

/**
 * Compare properties between original and overwrite to ensure that both are synchronized.
 * 
 * @param original The collection from data/wfs
 * @param overwrite The collection from data/overwrite
 * @returns 
 */
export function compare(original: Collection, overwrite?: CollectionOverwrite|null): string[] {
    if (!overwrite) {
        return [];
    }
    const originalNames = new Set(original.properties.map((p) => p.name))
    const overwriteNames = new Set(overwrite.properties.map((p) => p.name))
    const onlyInOriginal = [...originalNames].filter((n) => !overwriteNames.has(n))
    const onlyInOverwrite = [...overwriteNames].filter((n) => !originalNames.has(n))

    const differences = [
        ...onlyInOriginal.map((propertyName) => `Property "${propertyName}" missing in overwrite`),
        ...onlyInOverwrite.map((propertyName) => `Property "${propertyName}" is not present in WFS collection`),
    ];

    return differences;
}

