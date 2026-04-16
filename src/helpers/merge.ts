import {debuglog} from 'node:util';
const debug = debuglog('gpf-schema-store:merge');

import type { Collection, CollectionOverwrite } from "../types";

/**
 * Merge two collection schemas with the following rules :
 *
 * At collection level :
 *
 * - id is kept from original (WFS)
 * - namespace is kept from original (WFS)
 * - name is kept from original (WFS)
 * - title is taken from overwrite
 * - description is taken from overwrite
 * - selectionCriteria is taken from overwrite (when present)
 * - representedFeatures is taken from overwrite (when present)
 *
 * At property level :
 *
 * - properties are iterated from original (order kept)
 * - properties with `defaultCrs` are kept from original as-is (no overwrite applied)
 * - matching is done by property name
 * - if a property exists in overwrite, its fields are taken but name and type are kept from original.
 *   This means the following overwrite fields are propagated to the merged property:
 *   - title, description (documentary)
 *   - nullable (whether the property accepts null values)
 *   - allowedValues (structured allowed values with value, description, representedFeatures, availableWhen)
 * - if a property does not exist in overwrite, the original property is kept
 * - new properties from overwrite are ignored
 *
 * Overwrite fields that are NOT propagated:
 * - type (kept from WFS original; overwrite may contain legacy values like "numeric")
 *
 * @param original - The original collection schema (Géoplateforme WFS)
 * @param overwrite - The overwrite collection schema (data/overwrites)
 * @returns The resulting collection schema
 */
export function merge(
    original: Collection,
    overwrite: CollectionOverwrite | null
): Collection {
    if ( ! overwrite ){
        debug(`No overwrite found for collection "${original.id}", using original schema`);
        return original;
    }

    const properties = original.properties.map((origProp) => {
        if (origProp.defaultCrs) {
            return { ...origProp }
        }

        const overProp = overwrite.properties.find((p) => p.name === origProp.name)
        if (!overProp) {
            return { ...origProp }
        }
        return {
            ...overProp,
            name: origProp.name,
            type: origProp.type,
        }
    })

    return {
        id: original.id,
        namespace: original.namespace,
        name: original.name,
        title: overwrite.title,
        description: overwrite.description,
        ...(overwrite.selectionCriteria ? { selectionCriteria: overwrite.selectionCriteria } : {}),
        ...(overwrite.representedFeatures?.length ? { representedFeatures: overwrite.representedFeatures } : {}),
        properties
    }
}
