import { z } from 'zod';

/*
 * ============================================================================
 * Package Metadata
 * ============================================================================
 */

export const zPackageMetadata = z.looseObject({
  version: z.string().min(1),
});


/*
 * ============================================================================
 * Namespace Filters
 * ============================================================================
 */

/**
 * Metadata assigned to namespaces through data/namespace-filters.yaml.
 */
export const collectionMetadataSchema = z.object({
  ignored: z.boolean().describe('Indicates whether the namespace should be ignored'),
  ignoredReason: z.string().optional().describe('The reason for ignoring the namespace'),
  product: z.string().optional().describe('The product associated with the namespace'),
}).strict();

export type CollectionMetadata = z.infer<typeof collectionMetadataSchema>;

/**
 * Zod schema for a rule in data/namespace-filters.yaml
 */
export const namespaceFilterRuleSchema = z.object({
  id: z.string().min(1).describe('The unique identifier of the rule'),
  patterns: z.array(z.string()).describe('The patterns to match against the namespace'),
  metadata: collectionMetadataSchema.describe('The metadata to assign if the namespace matches the patterns'),
});

export type NamespaceFilterRule = z.infer<typeof namespaceFilterRuleSchema>;

/**
 * Zod schema for data/namespace-filters.yaml
 */
export const namespaceFiltersSchema = z.object({
  rules: z.array(namespaceFilterRuleSchema),
});
