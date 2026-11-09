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
export const zDatasetLink = z.strictObject({
  type: z.literal('wfs'),
  name: z.string().min(1).describe('WFS typename ({namespace}:{name}, `*` allowed for the name)'),
});

export type DatasetLink = z.infer<typeof zDatasetLink>;

/**
 * Excluded collections (only `wfs` for now).
 */
export const zDatasetExclude = z.strictObject({
  type: z.literal('wfs'),
  pattern: z.string().min(1).describe('Pattern on the WFS typename (`*` as wildcard)'),
  reason: z.string().min(1).optional(),
});

export type DatasetExclude = z.infer<typeof zDatasetExclude>;

/**
 * Zod schema for an entry of config/datasets.yaml
 */
export const zDataset = z.strictObject({
  id: z.string().min(1).describe('fileIdentifier of the record (csw) or local identifier (manual)'),
  source: zDatasetSource,
  title: z.string().min(1),
  ignored: z.boolean().optional().describe('Indicates whether the dataset should be ignored (default: false)'),
  ignoredReason: z.string().min(1).optional(),
  product: z.string().min(1).optional(),
  excludes: z.array(zDatasetExclude).optional(),
  links: z.array(zDatasetLink).optional(),
  missing: z.boolean().optional().describe('true when the record is no longer found in the CSW'),
});

export type Dataset = z.infer<typeof zDataset>;

/**
 * Zod schema for config/datasets.yaml
 */
export const zDatasetsConfig = z.strictObject({
  datasets: z.array(zDataset),
}).superRefine((config, ctx) => {
  const ids = new Set<string>();
  config.datasets.forEach((dataset, index) => {
    if (ids.has(dataset.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['datasets', index, 'id'],
        message: `Duplicate dataset id '${dataset.id}'`,
        input: ctx.value,
        continue: true,
      });
    }
    ids.add(dataset.id);
  });
});

export type DatasetsConfig = z.infer<typeof zDatasetsConfig>;
