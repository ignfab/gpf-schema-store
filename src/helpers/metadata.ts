import type { CollectionMetadata, NamespaceFilterRule} from "../types";
import { findFirstMatchingRule } from "./filter";

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
