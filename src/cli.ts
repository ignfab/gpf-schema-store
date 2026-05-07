import { createWriteStream, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from '@fast-csv/format';
import { Command } from 'commander';

import { writeRenderedCatalog } from './cli/render-catalog';
import { renderSearchOutputs } from './cli/search-outputs';
import { loadEnrichedCollections } from './enrichment/load-enriched-collections';
import { compare } from './helpers/compare';
import { getMetadataFromNamespace } from './helpers/metadata';
import { formatSchemaIssues } from './helpers/zod';
import { getDataDir } from './local-data/data-dir';
import { getNamespaceFilters } from './local-data/namespace-filters';
import { validateOverwriteReferences } from './overwrite/overwrite';
import { loadCollectionOverwrite } from './overwrite/overwrite-store';
import { MiniSearchCollectionSearchEngine } from './search/minisearch-engine';
import { WfsClient } from './services/wfs';
import { loadSourceCollections, replaceSourceCollections } from './source/source-store';
import {
  packageMetadataSchema,
  type NamespaceFilterRule,
  type SourceCollection,
  type SourceCollectionBrief,
} from './types';

/*
 * =============================================================================
 * CLI Configuration
 * =============================================================================
 */

const GPF_WFS_URL = 'https://data.geopf.fr/wfs';
const NAMESPACE_FILTERS_PATH = 'data/namespace-filters.yaml';
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
    .command('update')
    .description('Update the collections from the GPF WFS (data/wfs/{namespace}/{name}.json)')
    .action(updateCollections);

  program
    .command('check-overwrites')
    .description('Ensure that overwrites are in sync with local WFS snapshots (data/wfs)')
    .action(checkOverwrites);

  program
    .command('update-namespaces')
    .description('Update the namespaces.csv file with the WFS namespaces with metadata')
    .action(updateNamespaces);

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
  const result = packageMetadataSchema.safeParse(raw);
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

function loadNamespaceFilterRules(): NamespaceFilterRule[] {
  console.log(`Loading filters from ${NAMESPACE_FILTERS_PATH}...`);
  const namespaceFilterRules = getNamespaceFilters();
  console.log(`${namespaceFilterRules.length} filters loaded from ${NAMESPACE_FILTERS_PATH}.`);
  return namespaceFilterRules;
}

async function loadRemoteCollections(wfsClient: WfsClient): Promise<SourceCollectionBrief[]> {
  console.log('Get collections from the GPF WFS...');
  const collections = await wfsClient.getCollections();
  console.log(`${collections.length} collections retrieved from the GPF WFS.`);
  return collections;
}

function filterCollectionsByNamespaceRules(
  collections: SourceCollectionBrief[],
  namespaceFilterRules: NamespaceFilterRule[],
): SourceCollectionBrief[] {
  console.log('Filtering collections based on namespace filters...');
  const filteredCollections = collections.filter((collection) => {
    const metadata = getMetadataFromNamespace(collection.namespace, namespaceFilterRules);
    return !metadata.ignored;
  });
  console.log(`${filteredCollections.length} collections remain after filtering.`);
  return filteredCollections;
}

async function loadCollectionDetails(
  wfsClient: WfsClient,
  collections: SourceCollectionBrief[],
): Promise<SourceCollection[]> {
  console.log('Retrieve collection details for the filtered collections...');
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

async function updateCollections(): Promise<void> {
  const namespaceFilterRules = loadNamespaceFilterRules();
  const wfsClient = createWfsClient();
  const collections = await loadRemoteCollections(wfsClient);
  const filteredCollections = filterCollectionsByNamespaceRules(collections, namespaceFilterRules);
  const detailedCollections = await loadCollectionDetails(wfsClient, filteredCollections);

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

async function updateNamespaces(): Promise<void> {
  console.log('Updating namespaces.csv file with the WFS namespaces with metadata...');

  const namespaceFilterRules = loadNamespaceFilterRules();
  const collections = await loadRemoteCollections(createWfsClient());

  console.log('Extracting unique namespaces ...');
  const namespaces = [...new Set(collections.map((collection) => collection.namespace))].sort();
  console.log(`${namespaces.length} unique namespaces extracted.`);

  console.log('Writing namespaces and metadata to namespaces.csv...');
  const fileStream = createWriteStream(join(getDataDir(), 'namespaces.csv'));
  const stream = format({ delimiter: ',' });
  stream.pipe(fileStream);

  stream.write([
    'NAMESPACE',
    'PRODUCT',
    'IGNORED',
    'IGNORED_REASON',
    'COLLECTIONS',
  ]);

  for (const namespace of namespaces) {
    const metadata = getMetadataFromNamespace(namespace, namespaceFilterRules);
    stream.write([
      namespace,
      metadata.product,
      metadata.ignored,
      metadata.ignoredReason,
      collections.filter((collection) => collection.namespace === namespace).map((collection) => collection.name).join('|'),
    ]);
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
    stream.on('error', reject);
    stream.end();
  });

  console.log('Namespaces and metadata successfully written to namespaces.csv.');
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
