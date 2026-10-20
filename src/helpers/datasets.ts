import { dump as dumpYAML, load as loadYAML } from 'js-yaml';

import {
  zDatasetsConfig,
  type Dataset,
  type DatasetExclude,
  type DatasetsConfig,
} from '@/config/types';
import { isValidFileIdentifier } from '@/source/csw-store';
import type { CswRecord, CswRecordBrief } from '@/source/types';
import { matchPattern } from './pattern';
import { formatSchemaIssues } from './zod';

/*
 * =============================================================================
 * Read and write config/datasets.yaml
 * =============================================================================
 */

export const NEW_DATASET_REASON = 'New dataset, review required';
export const SERVICE_RECORD_REASON = 'Service record';

const DATASETS_HEADER = `# Datasets of the Géoplateforme, from the metadata records of https://data.geopf.fr/csw
#
# Updated by \`npm run update:datasets\` (comments are not preserved, see CODING.md) :
# - new records are added with \`ignored: true\` (review required, \`Service record\` for the services)
# - \`title\` and \`missing\` are refreshed for \`source: csw\`
# - decisions (\`ignored\`, \`ignoredReason\`, \`product\`, \`excludes\`, \`links\`) are preserved
#
# A WFS collection {namespace}:{name} is selected when a non-ignored dataset has a WFS link
# on its namespace (from data/csw/{id}.json or \`links\`) and no candidate excludes it.
`;

/**
 * Locale-independent comparison (code points) to keep a stable order.
 */
function compareIds(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

export function parseDatasets(yamlContent: string): DatasetsConfig {
  const result = zDatasetsConfig.safeParse(loadYAML(yamlContent));
  if (!result.success) {
    throw new Error(`Invalid datasets.yaml content: ${formatSchemaIssues(result.error)}`);
  }
  return result.data;
}

/**
 * Rebuilds a dataset with a stable key order, omitting default values.
 */
function normalizeDataset(dataset: Dataset): Dataset {
  return {
    id: dataset.id,
    source: dataset.source,
    title: dataset.title,
    ...(dataset.ignored ? { ignored: true } : {}),
    ...(dataset.ignoredReason ? { ignoredReason: dataset.ignoredReason } : {}),
    ...(dataset.product ? { product: dataset.product } : {}),
    ...(dataset.excludes?.length
      ? {
          excludes: dataset.excludes.map((exclude) => ({
            type: exclude.type,
            pattern: exclude.pattern,
            ...(exclude.reason ? { reason: exclude.reason } : {}),
          })),
        }
      : {}),
    ...(dataset.links?.length
      ? { links: dataset.links.map((link) => ({ type: link.type, name: link.name })) }
      : {}),
    ...(dataset.missing ? { missing: true } : {}),
  };
}

export function sortDatasets(datasets: Dataset[]): Dataset[] {
  return [...datasets].sort((a, b) => compareIds(a.id, b.id));
}

export function dumpDatasets(config: DatasetsConfig): string {
  const validated = zDatasetsConfig.parse(config);
  const entries = sortDatasets(validated.datasets).map((dataset) =>
    dumpYAML([normalizeDataset(dataset)], { lineWidth: -1, noRefs: true })
      .trimEnd()
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
  );
  return `${DATASETS_HEADER}\ndatasets:\n\n${entries.join('\n\n')}\n`;
}

/*
 * =============================================================================
 * Merge the list of the CSW records
 * =============================================================================
 */

export type UpdateDatasetsReport = {
  /** new records, added with `ignored: true` */
  added: string[];
  /** service records flagged with `Service record` (new ones or still waiting for a review) */
  services: string[];
  /** csw entries whose title has been refreshed */
  updated: string[];
  /** csw entries whose record has disappeared (newly flagged) */
  missing: string[];
  /** csw entries whose record came back */
  restored: string[];
  /** records skipped because their fileIdentifier is not usable as a file name */
  skipped: string[];
  /** records whose fileIdentifier is already used by a manual entry */
  conflicts: string[];
  /** manual entries without links */
  manualWithoutLinks: string[];
};

export type UpdateDatasetsResult = {
  config: DatasetsConfig;
  report: UpdateDatasetsReport;
};

function getRecordTitle(record: CswRecordBrief): string {
  return record.title.trim() || record.fileIdentifier;
}

/**
 * The records describing a service (ex : the Géoplateforme APIs) hold no data.
 *
 * Note that the distinction between `dataset` and `series` is not reliable.
 */
function isServiceRecord(record: CswRecordBrief): boolean {
  return record.type === 'service';
}

/**
 * Merges the list of the CSW records into the configuration, preserving the decisions.
 */
export function updateDatasets(config: DatasetsConfig, records: CswRecordBrief[]): UpdateDatasetsResult {
  const report: UpdateDatasetsReport = {
    added: [],
    services: [],
    updated: [],
    missing: [],
    restored: [],
    skipped: [],
    conflicts: [],
    manualWithoutLinks: [],
  };

  const recordsById = new Map<string, CswRecordBrief>();
  for (const record of records) {
    if (!isValidFileIdentifier(record.fileIdentifier)) {
      report.skipped.push(record.fileIdentifier);
      continue;
    }
    recordsById.set(record.fileIdentifier, record);
  }

  const datasets: Dataset[] = [];
  const knownIds = new Set<string>();

  for (const dataset of config.datasets) {
    knownIds.add(dataset.id);

    if (dataset.source === 'manual') {
      if (recordsById.has(dataset.id)) {
        report.conflicts.push(dataset.id);
      }
      if (!dataset.links?.length) {
        report.manualWithoutLinks.push(dataset.id);
      }
      datasets.push(dataset);
      continue;
    }

    const record = recordsById.get(dataset.id);
    if (!record) {
      if (!dataset.missing) {
        report.missing.push(dataset.id);
      }
      datasets.push({ ...dataset, missing: true });
      continue;
    }

    const title = getRecordTitle(record);
    if (title !== dataset.title) {
      report.updated.push(dataset.id);
    }
    if (dataset.missing) {
      report.restored.push(dataset.id);
    }
    const { missing: _missing, ...rest } = dataset;
    // Only the default decision is replaced for the service records.
    if (isServiceRecord(record) && dataset.ignored && dataset.ignoredReason === NEW_DATASET_REASON) {
      report.services.push(dataset.id);
      datasets.push({ ...rest, title, ignoredReason: SERVICE_RECORD_REASON });
      continue;
    }
    datasets.push({ ...rest, title });
  }

  for (const record of recordsById.values()) {
    if (knownIds.has(record.fileIdentifier)) {
      continue;
    }
    report.added.push(record.fileIdentifier);
    if (isServiceRecord(record)) {
      report.services.push(record.fileIdentifier);
    }
    datasets.push({
      id: record.fileIdentifier,
      source: 'csw',
      title: getRecordTitle(record),
      ignored: true,
      ignoredReason: isServiceRecord(record) ? SERVICE_RECORD_REASON : NEW_DATASET_REASON,
    });
  }

  for (const ids of Object.values(report)) {
    ids.sort(compareIds);
  }

  return {
    config: { datasets: sortDatasets(datasets).map(normalizeDataset) },
    report,
  };
}

/*
 * =============================================================================
 * Resolve datasets (record + decisions)
 * =============================================================================
 */

export type ResolvedDataset = {
  id: string;
  source: Dataset['source'];
  title: string;
  ignored: boolean;
  product?: string;
  /** WFS typenames from the record and from `links` */
  wfsLinks: string[];
  excludes: DatasetExclude[];
  /** the metadata record (csw), if available */
  record?: CswRecord;
};

/**
 * Builds a unified view of the datasets : decisions from config/datasets.yaml
 * and record links completed by `links`.
 */
export function resolveDatasets(config: DatasetsConfig, records: CswRecord[]): ResolvedDataset[] {
  const recordsById = new Map(records.map((record) => [record.fileIdentifier, record]));

  return config.datasets.map((dataset) => {
    const record = dataset.source === 'csw' ? recordsById.get(dataset.id) : undefined;
    const recordWfsLinks = (record?.links ?? [])
      .filter((link) => link.type === 'wfs' && link.name)
      .map((link) => link.name as string);
    const configWfsLinks = (dataset.links ?? [])
      .filter((link) => link.type === 'wfs')
      .map((link) => link.name);

    return {
      id: dataset.id,
      source: dataset.source,
      title: dataset.title,
      ignored: dataset.ignored ?? false,
      ...(dataset.product ? { product: dataset.product } : {}),
      wfsLinks: [...new Set([...recordWfsLinks, ...configWfsLinks])],
      excludes: (dataset.excludes ?? []).filter((exclude) => exclude.type === 'wfs'),
      ...(record ? { record } : {}),
    };
  });
}

/*
 * =============================================================================
 * WFS collection selection
 * =============================================================================
 */

const TYPENAME_PATTERN = /^([^:\s]+):[^:]+$/;

/**
 * Returns the namespace of a WFS typename ({namespace}:{name}) or undefined.
 */
export function getTypenameNamespace(typename: string): string | undefined {
  return TYPENAME_PATTERN.exec(typename.trim())?.[1];
}

export type CollectionSelection =
  | { selected: true; datasets: string[] }
  | { selected: false; datasets: string[]; reason: string };

export const NO_DATASET_REASON = 'No dataset';

/**
 * Selects a WFS collection {namespace}:{name} :
 *
 * - the candidates are the non-ignored datasets with a WFS link on the namespace;
 * - the collection is ignored if one of the candidates excludes it (exclusions always win);
 * - the collection is ignored when there is no candidate.
 */
export function selectCollection(typename: string, datasets: ResolvedDataset[]): CollectionSelection {
  const namespace = getTypenameNamespace(typename);
  const candidates = namespace === undefined
    ? []
    : datasets.filter((dataset) =>
        !dataset.ignored
        && dataset.wfsLinks.some((link) => getTypenameNamespace(link) === namespace),
      );
  const candidateIds = candidates.map((dataset) => dataset.id);

  if (candidates.length === 0) {
    return { selected: false, datasets: [], reason: NO_DATASET_REASON };
  }

  for (const candidate of candidates) {
    const exclude = candidate.excludes.find((item) => matchPattern(typename, item.pattern));
    if (exclude) {
      return {
        selected: false,
        datasets: candidateIds,
        reason: `Excluded by ${candidate.id} (${exclude.pattern})${exclude.reason ? `: ${exclude.reason}` : ''}`,
      };
    }
  }

  return { selected: true, datasets: candidateIds };
}
