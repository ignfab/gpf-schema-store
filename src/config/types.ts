import { z } from 'zod';

/*
 * ============================================================================
 * Package Metadata
 * ============================================================================
 */

export const zPackageMetadata = z.object({
  version: z.string().min(1),
}).passthrough();


/*
 * ============================================================================
 * Namespace Filters
 * ============================================================================
 */

/**
 * Metadata assigned to namespaces through data/namespace-filters.yaml.
 */
export const zNamespaceFilterMetadata = z.object({
  ignored: z.boolean().describe('Indicates whether the namespace should be ignored'),
  ignoredReason: z.string().optional().describe('The reason for ignoring the namespace'),
  product: z.string().optional().describe('The product associated with the namespace'),
}).strict();

export type NamespaceFilterMetadata = z.infer<typeof zNamespaceFilterMetadata>;

/**
 * Zod schema for a rule in data/namespace-filters.yaml
 */
export const zNamespaceFilterRule = z.object({
  id: z.string().min(1).describe('The unique identifier of the rule'),
  patterns: z.array(z.string()).describe('The patterns to match against the namespace'),
  metadata: zNamespaceFilterMetadata.describe('The metadata to assign if the namespace matches the patterns'),
});

export type NamespaceFilterRule = z.infer<typeof zNamespaceFilterRule>;

/**
 * Zod schema for data/namespace-filters.yaml
 */
export const zNamespaceFiltersFile = z.object({
  rules: z.array(zNamespaceFilterRule),
});
