import type { Collection } from "../types";

/** Logs a warning when the property name sets of `original` and `overwrite` differ. */
function compare(original: Collection, overwrite: Collection): void {
    const originalNames = new Set(original.properties.map((p) => p.name))
    const overwriteNames = new Set(overwrite.properties.map((p) => p.name))
    const onlyInOriginal = [...originalNames].filter((n) => !overwriteNames.has(n))
    const onlyInOverwrite = [...overwriteNames].filter((n) => !originalNames.has(n))

    if (onlyInOriginal.length > 0 || onlyInOverwrite.length > 0) {
        const parts: string[] = []
        if (onlyInOriginal.length > 0) {
            parts.push(`only in original: ${onlyInOriginal.join(', ')}`)
        }
        if (onlyInOverwrite.length > 0) {
            parts.push(`only in overwrite (ignored): ${onlyInOverwrite.join(', ')}`)
        }
        console.warn(
            `[compare] Property lists differ for collection "${original.id}": ${parts.join('; ')}`
        )
    }
}

/**
 * Merge two collection schemas with the following rules :
 * 
 * At collection level :
 * 
 * - id is kept from original
 * - all other fields are replaced by those from overwrite
 * 
 * At property level :
 * 
 * - name is kept from original
 * - new properties from overwrite are ignored
 * 
 * @example
 * ```ts
 * mergeCollectionSchema(
 *   { id: 'a:c', namespace: 'a', name: 'c', title: 'T0', description: 'D0', properties: [{ name: 'p', type: 'int' }] },
 *   { id: 'b:c', namespace: 'b', name: 'c', title: 'T1', description: 'D1', properties: [{ name: 'p', type: 'string' }] }
 * )
 * // => { id: 'a:c', namespace: 'b', name: 'c', title: 'T1', description: 'D1', properties: [{ name: 'p', type: 'string' }] }
 * ```
 *
 * @param original - The original collection schema (Géoplateforme)
 * @param overwrite - The overwrite collection schema (overwrites)
 * @returns The resulting collection schema
 *
 * @remarks {@link compare} emits a {@link console.warn} when the sets of property names differ
 * between `original` and `overwrite` (missing names or extra names in overwrite).
 */
export function merge(
    original: Collection,
    overwrite: Collection | null
): Collection {
    if ( ! overwrite ){
        console.log(`[merge] No overwrite found for collection "${original.id}", using original schema`);
        return original;
    }
    
    compare(original, overwrite)

    const properties = original.properties.map((origProp) => {
        const overProp = overwrite.properties.find((p) => p.name === origProp.name)
        if (!overProp) {
            return { ...origProp }
        }
        return {
            ...overProp,
            name: origProp.name,
        }
    })

    return {
        id: original.id,
        namespace: original.namespace,
        name: original.name,
        title: overwrite.title,
        description: overwrite.description,
        properties,
    }
}

