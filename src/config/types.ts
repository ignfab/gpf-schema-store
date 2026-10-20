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


/*
 * ============================================================================
 * Datasets
 * ============================================================================
 */

/**
 * `csw` for a metadata record of https://data.geopf.fr/csw (`id` = fileIdentifier),
 * `manual` for a dataset without metadata record.
 */
export const zDatasetSource = z.enum(['csw', 'manual']);

export type DatasetSource = z.infer<typeof zDatasetSource>;

/**
 * Link completing those of the metadata record (only `wfs` for now).
 */
export const zDatasetLink = z.object({
  type: z.literal('wfs'),
  name: z.string().min(1).describe('WFS typename ({namespace}:{name}, `*` allowed for the name)'),
}).strict();

export type DatasetLink = z.infer<typeof zDatasetLink>;

/**
 * Excluded collections (only `wfs` for now).
 */
export const zDatasetExclude = z.object({
  type: z.literal('wfs'),
  pattern: z.string().min(1).describe('Pattern on the WFS typename (`*` as wildcard)'),
  reason: z.string().min(1).optional(),
}).strict();

export type DatasetExclude = z.infer<typeof zDatasetExclude>;

/**
 * Zod schema for an entry of config/datasets.yaml
 */
export const zDataset = z.object({
  id: z.string().min(1).describe('fileIdentifier of the record (csw) or local identifier (manual)'),
  source: zDatasetSource,
  title: z.string().min(1),
  ignored: z.boolean().optional().describe('Indicates whether the dataset should be ignored (default: false)'),
  ignoredReason: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  excludes: z.array(zDatasetExclude).optional(),
  links: z.array(zDatasetLink).optional(),
  missing: z.boolean().optional().describe('true when the record is no longer found in the CSW'),
}).strict();

export type Dataset = z.infer<typeof zDataset>;

/**
 * Zod schema for config/datasets.yaml
 */
export const zDatasetsConfig = z.object({
  datasets: z.array(zDataset),
}).strict().superRefine((config, ctx) => {
  const ids = new Set<string>();
  config.datasets.forEach((dataset, index) => {
    if (ids.has(dataset.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['datasets', index, 'id'],
        message: `Duplicate dataset id '${dataset.id}'`,
      });
    }
    ids.add(dataset.id);
  });
});

export type DatasetsConfig = z.infer<typeof zDatasetsConfig>;
