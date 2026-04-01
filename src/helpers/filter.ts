import yaml from 'js-yaml';
import type { NamespaceFilterRule } from '../types';

/**
 * Loads namespace filters from a YAML string read from data/namespace-filters.yaml.
 *
 * @param yamlContent The YAML content as a string.
 * @return An array of NamespaceFilterRule objects parsed from the YAML content.
 */
export function loadNamespaceFilters(yamlContent: string): NamespaceFilterRule[] {
    const filters: NamespaceFilterRule[] = [];
    const data = yaml.load(yamlContent);

    // Ensure that data is an object
    if (typeof data !== 'object' || data === null || !('rules' in (data as object))) {
        throw new Error('Invalid YAML format: Expected an object with a "rules" key.');
    }

    // Ensure that the "rules" key is an array
    if ( ! Array.isArray((data as any).rules) ) {
        throw new Error('Invalid YAML format: Expected an array for the "rules" key.');
    }

    // Parse each item in the rules array
    const rules = (data as any).rules as any[] ;
    for (const item of rules) {
        if (typeof item === 'object' && item !== null) {
            const filter: NamespaceFilterRule = {
                id: item.id,
                patterns: item.patterns,
                metadata: {
                    ignored: item.metadata?.ignored ?? false,
                    ignoredReason: item.metadata?.ignoredReason,
                    product: item.metadata?.product
                }
            };
            filters.push(filter);
        }
    }

    return filters;
}

/**
 * Returns the first NamespaceFilterRule whose patterns match the given namespace, or undefined if none match.
 * 
 * @param namespace 
 * @param rules The array of NamespaceFilterRule objects to match against.
 * @returns the first matching NamespaceFilterRule, or undefined if no match
 */
export function findFirstMatchingRule(namespace: string, rules: NamespaceFilterRule[]): NamespaceFilterRule | undefined {
    const escapeRegExp = (value: string): string =>
        value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const rule of rules) {
        for (const pattern of rule.patterns) {
            // `*` is a wildcard, everything else is matched literally.
            const regexPattern = `^${escapeRegExp(pattern).replace(/\\\*/g, '.*')}$`;
            if (new RegExp(regexPattern).test(namespace)) {
                return rule;
            }
        }
    }

    return undefined;
}
