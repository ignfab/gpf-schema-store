import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { writeRenderedCatalog } from './cli/render-catalog';
import { renderSearchOutputs } from './cli/search-outputs';
import { loadEnrichedCollections } from './enrichment/load-enriched-collections';
import { compare } from './helpers/compare';
import { formatSchemaIssues } from './helpers/zod';
import { loadDatasetsConfig, writeDatasetsConfig } from './config/datasets';
import {
  resolveDatasets,
  selectCollection,
  SERVICE_RECORD_REASON,
  updateDatasets as mergeDatasets,
  type ResolvedDataset,
  type UpdateDatasetsReport,
} from './helpers/datasets';
import { validateOverwriteReferences } from './overwrite/overwrite';
import { loadCollectionOverwrite } from './overwrite/overwrite-store';
import { MiniSearchCollectionSearchEngine } from './search/minisearch-engine';
import { CswClient } from './source/csw';
import { loadCswRecords, replaceCswRecords } from './source/csw-store';
import { WfsClient } from './source/wfs';
import { loadSourceCollections, replaceSourceCollections } from './source/source-store';
import { zPackageMetadata } from './config/types';
import {
  type CswRecord,
  type SourceCollection,
  type SourceCollectionBrief
} from './source/types';

/*
 * =============================================================================
 * CLI Configuration
 * =============================================================================
 */

const GPF_WFS_URL = 'https://data.geopf.fr/wfs';
const GPF_CSW_URL = 'https://data.geopf.fr/csw';
const DATASETS_CONFIG_PATH = 'config/datasets.yaml';
const CSW_RECORDS_DIR = 'data/csw';
const WFS_SNAPSHOT_DIR = 'data/wfs';
const PACKAGE_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');

type SearchCommandOptions = {
  limit: string;
};

type RenderCatalogCommandOptions = {
  clean?: boolean;
};

/*
 * =============================================================================
 * Command registration
 * =============================================================================
 */

function buildProgram(): Command {
  const program = new Command();

  program
    .name('gpf-schema-store')
    .description('Application en ligne de commande')
    .version(loadPackageVersion());

  program
    .command('update-datasets')
    .description('Update config/datasets.yaml from the list of the CSW records (decisions are preserved)')
    .action(updateDatasets);

  program
    .command('update-csw')
    .description('Download the records of the non-ignored datasets from the CSW (data/csw/{fileIdentifier}.json)')
    .action(updateCswRecords);

  program
    .command('csw-dump')
    .description('Print a record of the CSW in the pivot format (JSON)')
    .argument('<fileIdentifier>', 'fileIdentifier of the record')
    .action(dumpCswRecord);

  program
    .command('update-wfs')
    .description('Update the collections from the GPF WFS (data/wfs/{namespace}/{name}.json)')
    .action(updateCollections);

  program
    .command('check-overwrites')
    .description('Ensure that overwrites are in sync with local WFS snapshots (data/wfs)')
    .action(checkOverwrites);

  program
    .command('search')
    .description('Search the local collection catalog with the default MiniSearch options')
    .argument('<query...>', 'Search query')
    .option('-l, --limit <number>', 'Maximum number of results to display', '10')
    .action(searchCollections);

  program
    .command('render-catalog')
    .description('Write the catalog collection schemas to an output directory')
    .argument('<outputDir>', 'Output directory for collection schema JSON files')
    .option('--clean', 'Remove the output directory before writing')
    .action(renderCatalog);

  program.action(() => {
    console.log('gpf-schema-store - CLI ready. Use --help for options.');
  });

  return program;
}

/*
 * =============================================================================
 * Shared loaders and argument parsers
 * =============================================================================
 */


function loadPackageVersion(): string {
  const raw = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as unknown;
  const result = zPackageMetadata.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid package metadata ${PACKAGE_JSON_PATH}: ${formatSchemaIssues(result.error)}`,
    );
  }
  return result.data.version;
}

function createWfsClient(): WfsClient {
  return new WfsClient(GPF_WFS_URL);
}

function warnDatasets(ids: string[], message: string): void {
  for (const id of ids) {
    console.warn(`WARNING: [${id}] ${message}`);
  }
}

function printUpdateDatasetsReport(report: UpdateDatasetsReport): void {
  warnDatasets(report.added, 'new dataset added with ignored: true (review required)');
  warnDatasets(report.services, `service record flagged with ignoredReason: ${SERVICE_RECORD_REASON}`);
  warnDatasets(report.missing, 'record no longer found in the CSW (flagged with missing: true)');
  warnDatasets(report.restored, 'record found again in the CSW (missing flag removed)');
  warnDatasets(report.skipped, 'record skipped (fileIdentifier not usable as a file name)');
  warnDatasets(report.conflicts, 'record ignored (fileIdentifier already used by a manual dataset)');
  warnDatasets(report.manualWithoutLinks, 'manual dataset without links');
  console.log(
    `${report.added.length} added, ${report.services.length} services, ${report.updated.length} titles updated, ${report.missing.length} missing, ${report.restored.length} restored, ${report.skipped.length} skipped.`,
  );
}

function loadResolvedDatasets(): ResolvedDataset[] {
  console.log(`Loading datasets from ${DATASETS_CONFIG_PATH} and ${CSW_RECORDS_DIR}...`);
  const config = loadDatasetsConfig();
  const records = loadCswRecords();
  const datasets = resolveDatasets(config, records);

  for (const dataset of datasets) {
    if (dataset.source === 'csw' && !dataset.ignored && !dataset.record) {
      console.warn(`WARNING: [${dataset.id}] no record in ${CSW_RECORDS_DIR} for a non-ignored dataset (run npm run update:csw)`);
    }
  }

  const enabledCount = datasets.filter((dataset) => !dataset.ignored).length;
  console.log(`${datasets.length} datasets loaded (${enabledCount} non-ignored, ${records.length} records).`);
  return datasets;
}

async function loadRemoteCollections(wfsClient: WfsClient): Promise<SourceCollectionBrief[]> {
  console.log('Get collections from the GPF WFS...');
  const collections = await wfsClient.getCollections();
  console.log(`${collections.length} collections retrieved from the GPF WFS.`);
  return collections;
}

function selectCollections(
  collections: SourceCollectionBrief[],
  datasets: ResolvedDataset[],
): SourceCollectionBrief[] {
  console.log('Selecting collections based on datasets...');
  const namespacesWithoutDataset = new Map<string, number>();

  const selectedCollections = collections.filter((collection) => {
    const selection = selectCollection(collection.id, datasets);
    if (selection.selected) {
      return true;
    }
    if (selection.datasets.length === 0) {
      namespacesWithoutDataset.set(collection.namespace, (namespacesWithoutDataset.get(collection.namespace) ?? 0) + 1);
    } else {
      console.log(`Ignored ${collection.id}: ${selection.reason}`);
    }
    return false;
  });

  for (const [namespace, count] of [...namespacesWithoutDataset].sort(([a], [b]) => (a < b ? -1 : 1))) {
    console.warn(`WARNING: [${namespace}] WFS namespace without dataset (${count} collections ignored)`);
  }
  console.log(`${namespacesWithoutDataset.size} WFS namespaces without dataset.`);
  console.log(`${selectedCollections.length} collections selected.`);
  return selectedCollections;
}

async function loadCollectionDetails(
  wfsClient: WfsClient,
  collections: SourceCollectionBrief[],
): Promise<SourceCollection[]> {
  console.log('Retrieve collection details for the selected collections...');
  const detailedCollections: SourceCollection[] = [];

  for (const collection of collections) {
    console.log(`Retrieving details for collection ${collection.id}...`);
    detailedCollections.push(await wfsClient.getCollection(collection.id));
  }

  console.log(`Details retrieved for ${detailedCollections.length} collections.`);
  return detailedCollections;
}

function loadLocalCollections(): SourceCollection[] {
  console.log(`Loading local WFS snapshots from ${WFS_SNAPSHOT_DIR}...`);
  const collections = loadSourceCollections();
  console.log(`${collections.length} local WFS collections loaded from ${WFS_SNAPSHOT_DIR}.`);
  return collections;
}

function loadMergedCollections() {
  console.log('Loading merged collections from the local catalog...');
  const collections = loadEnrichedCollections();
  console.log(`${collections.length} merged collections loaded from the local catalog.`);
  return collections;
}

function parseSearchLimit(rawLimit: string): number {
  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`Invalid limit '${rawLimit}': expected a non-negative integer`);
  }
  return limit;
}

/*
 * =============================================================================
 * Command handlers
 * =============================================================================
 */

async function updateDatasets(): Promise<void> {
  console.log(`Loading datasets from ${DATASETS_CONFIG_PATH}...`);
  const config = loadDatasetsConfig({ allowMissing: true });
  console.log(`${config.datasets.length} datasets loaded from ${DATASETS_CONFIG_PATH}.`);

  console.log(`Listing the records from ${GPF_CSW_URL}...`);
  const records = await new CswClient(GPF_CSW_URL).listRecords();
  console.log(`${records.length} records retrieved from the CSW.`);

  const { config: updatedConfig, report } = mergeDatasets(config, records);
  printUpdateDatasetsReport(report);

  writeDatasetsConfig(updatedConfig);
  console.log(`${updatedConfig.datasets.length} datasets saved to ${DATASETS_CONFIG_PATH}.`);
}

async function updateCswRecords(): Promise<void> {
  console.log(`Loading datasets from ${DATASETS_CONFIG_PATH}...`);
  const config = loadDatasetsConfig();
  const datasets = config.datasets.filter((dataset) => dataset.source === 'csw' && !dataset.ignored);
  console.log(`${datasets.length} non-ignored csw datasets found in ${DATASETS_CONFIG_PATH}.`);

  const cswClient = new CswClient(GPF_CSW_URL);
  const records: CswRecord[] = [];
  for (const dataset of datasets) {
    if (dataset.missing) {
      console.warn(`WARNING: [${dataset.id}] non-ignored dataset flagged as missing in the CSW (skipped)`);
      continue;
    }
    console.log(`Retrieving record ${dataset.id}...`);
    records.push(await cswClient.getRecord(dataset.id));
  }

  console.log(`Replacing local records in ${CSW_RECORDS_DIR}...`);
  replaceCswRecords(records);
  console.log(`${records.length} records saved to ${CSW_RECORDS_DIR}/{fileIdentifier}.json`);
}

async function dumpCswRecord(fileIdentifier: string): Promise<void> {
  const record = await new CswClient(GPF_CSW_URL).getRecord(fileIdentifier);
  console.log(JSON.stringify(record, null, 2));
}

async function updateCollections(): Promise<void> {
  const datasets = loadResolvedDatasets();
  const wfsClient = createWfsClient();
  const collections = await loadRemoteCollections(wfsClient);
  const selectedCollections = selectCollections(collections, datasets);
  const detailedCollections = await loadCollectionDetails(wfsClient, selectedCollections);

  console.log(`Replacing local WFS snapshots in ${WFS_SNAPSHOT_DIR}...`);
  replaceSourceCollections(detailedCollections);
  console.log(`${detailedCollections.length} collections saved to ${WFS_SNAPSHOT_DIR}/{namespace}/{name}.json`);
}

function checkOverwrites(): void {
  const collections = loadLocalCollections();
  let countDifferences = 0;

  for (const collection of collections) {
    const overwrite = loadCollectionOverwrite(collection.namespace, collection.name);
    if (!overwrite) {
      console.log(`[${collection.id}] OK (no overwrite)`);
      continue;
    }

    validateOverwriteReferences(collection, overwrite);
    const differences = compare(collection, overwrite);

    if (differences.length === 0) {
      console.log(`[${collection.id}] OK (no difference between local WFS and overwrite)`);
      continue;
    }

    countDifferences += differences.length;
    console.error(`[${collection.id}] KO (differences between local WFS and overwrite) :`);
    for (const difference of differences) {
      console.error(`[${collection.id}] - ${difference}`);
    }
  }

  if (countDifferences > 0) {
    console.error(`Failure : Found ${countDifferences} differences between local WFS snapshots and overwrites. Please update the overwrites to match data/wfs collections.`);
    process.exitCode = 1;
    return;
  }

  console.log('Success : No difference found between local WFS snapshots and overwrites.');
}

function searchCollections(queryParts: string[], options: SearchCommandOptions): void {
  const query = queryParts.join(' ').trim();
  if (query.length === 0) {
    throw new Error('Search query cannot be empty');
  }

  const limit = parseSearchLimit(options.limit);
  const collections = loadEnrichedCollections();
  const engine = new MiniSearchCollectionSearchEngine(collections);
  const matches = engine.searchDetailed(query).slice(0, limit);

  for (const line of renderSearchOutputs(engine, query, matches)) {
    console.log(line);
  }
}

function renderCatalog(outputDir: string, options: RenderCatalogCommandOptions): void {
  const collections = loadMergedCollections();

  console.log(`Writing collection schemas to ${outputDir}/{namespace}/{name}.json...`);
  const resolvedOutputDir = writeRenderedCatalog(collections, outputDir, {
    clean: options.clean,
  });

  console.log(`Success : ${collections.length} collection schemas written to ${resolvedOutputDir}.`);
}

// CLI entrypoint.
const program = buildProgram();

if (process.argv.slice(2).length === 0) {
  program.help();
}

await program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
