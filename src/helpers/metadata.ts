import type { CollectionMetadata, NamespaceFilterRule} from "../types";
import { findFirstMatchingRule } from "./namespace-filters";

/**
 * Split a WFS feature type identifier into namespace and table (local) name.
 * Accepts exactly one colon separating two non-empty parts (`{namespace}:{table}`).
 */
export function parseFeatureTypeName(fullName: string): { namespace: string; name: string } {
    const parts = fullName.split(':');
    const isValid =
        parts.length === 2 &&
        parts[0] !== '' &&
        parts[1] !== '';
    if (!isValid) {
        throw new Error(
            'Unexpected format for typename : ' +
                fullName +
                ' (expected : {namespace}:{table})',
        );
    }
    return { namespace: parts[0], name: parts[1] };
}

/**
 * Get the metadata of a collection from its namespace.
 * @param namespace - The namespace of the collection
 * @returns The metadata of the collection
 */
export function getMetadataFromNamespace(namespace: string, namespaceFilterRules: NamespaceFilterRule[]): CollectionMetadata {
    const matchingRule = findFirstMatchingRule(namespace, namespaceFilterRules);
    if (matchingRule) {
        return matchingRule.metadata;
    }

    return { ignored: true, ignoredReason: 'No matching rule' };
}
