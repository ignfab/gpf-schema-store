import yaml from 'js-yaml';

import { namespaceFiltersSchema, type NamespaceFilterRule } from '../types';
import { formatSchemaIssues } from './zod';

/**
 * Loads namespace filters from a YAML string read from data/namespace-filters.yaml.
 *
 * @param yamlContent The YAML content as a string.
 * @return An array of NamespaceFilterRule objects parsed from the YAML content.
 */
export function loadNamespaceFilters(yamlContent: string): NamespaceFilterRule[] {
  const data = yaml.load(yamlContent);
  const result = namespaceFiltersSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid namespace-filters.yaml content: ${formatSchemaIssues(result.error)}`);
  }

  return result.data.rules.map((rule) => ({
    id: rule.id,
    patterns: rule.patterns,
    metadata: {
      ignored: rule.metadata.ignored,
      ignoredReason: rule.metadata.ignoredReason,
      product: rule.metadata.product,
    },
  }));
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
