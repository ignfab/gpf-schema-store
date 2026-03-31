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
 * - namespace is kept from original
 * - name is kept from original
 * - title is taken from overwrite
 * - description is taken from overwrite
 * 
 * At property level :
 * 
 * - properties are iterated from original (order kept)
 * - matching is done by property name
 * - if a property exists in overwrite, its fields are taken but name is kept from original
 * - if a property does not exist in overwrite, the original property is kept
 * - new properties from overwrite are ignored
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
        properties
    }
}

