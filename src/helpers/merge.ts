import {debuglog} from 'node:util';
const debug = debuglog('gpf-schema-store:merge');

import type { Collection, CollectionOverwrite } from "../types";

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
 * - if a property exists in overwrite, its fields are taken but name, type and defaultCrs are kept from original
 * - if a property does not exist in overwrite, the original property is kept
 * - new properties from overwrite are ignored
 *
 * @param original - The original collection schema (Géoplateforme)
 * @param overwrite - The overwrite collection schema (overwrites)
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
        const overProp = overwrite.properties.find((p) => p.name === origProp.name)
        if (!overProp) {
            return { ...origProp }
        }
        const overwriteFields = { ...overProp };
        delete overwriteFields.type;
        return {
            ...overwriteFields,
            name: origProp.name,
            type: origProp.type,
            ...(origProp.defaultCrs ? { defaultCrs: origProp.defaultCrs } : {}),
        }
    })

    return {
        id: original.id,
        namespace: original.namespace,
        name: original.name,
        title: overwrite.title,
        description: overwrite.description,
        ...(overwrite['x-ign-theme'] ? { 'x-ign-theme': overwrite['x-ign-theme'] } : {}),
        ...(overwrite['x-ign-selectionCriteria'] ? { 'x-ign-selectionCriteria': overwrite['x-ign-selectionCriteria'] } : {}),
        ...(overwrite['x-ign-representedFeatures'] ? { 'x-ign-representedFeatures': overwrite['x-ign-representedFeatures'] } : {}),
        ...(overwrite.required ? { required: overwrite.required } : {}),
        properties
    }
}
