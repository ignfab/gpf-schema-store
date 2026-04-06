import { createWriteStream, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Command } from 'commander'

import { format } from '@fast-csv/format';

import { getCollections } from './services/wfs'
import { getDataDir, writeWfsCollection, clearWfsCollections, getNamespaceFilters, loadWfsCollections, getOverwrite, loadCollections } from './services/storage'
import { getMetadataFromNamespace } from './helpers/metadata'
import { compare } from './helpers/compare';
import { MiniSearchCollectionSearchEngine } from './search/minisearch-engine';
import { renderSearchOutputs } from './cli/search-outputs';
import { writeRenderedCatalog } from './cli/render-catalog';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }

const program = new Command()

program
  .name('gpf-schema-store')
  .description('Application en ligne de commande')
  .version(version)

const GPF_WFS_URL = "https://data.geopf.fr/wfs";

program
  .command('update')
  .description('Update the collections from the GPF WFS (data/wfs/{namespace}/{name}.json)')
  .action(async () => {
    console.log('Loading filters from data/namespace-filters.yaml...');
    const namespaceFilterRules = getNamespaceFilters();
    console.log(`${namespaceFilterRules.length} filters loaded from data/namespace-filters.yaml.`);

    console.log('Get collections from the GPF WFS...');
    const collections = await getCollections(GPF_WFS_URL, { namespaceFilterRules, withProperties: true });
    console.log(`${collections.length} collections retrieved from the GPF WFS.`);

    console.log('Clearing existing collections in data/wfs...');
    clearWfsCollections();
    console.log('Existing collections cleared from data/wfs.');

    console.log('Saving collections to data/wfs/{namespace}/{name}.json...');
    const filteredCollections = collections.filter((c) => c.properties.length > 0);
    for (const collection of filteredCollections) {
      writeWfsCollection(collection);
    }

    console.log(`${filteredCollections.length} collections saved to data/wfs/{namespace}/{name}.json`);
  })

program
  .command('check-overwrites')
  .description('Ensure that overwrites are in sync with local WFS snapshots (data/wfs)')
  .action(async () => {
    // load raw collections from data/wfs and compare them with data/overwrites
    console.log('Loading local WFS snapshots from data/wfs...');
    const collections = loadWfsCollections();
    console.log(`${collections.length} local WFS collections loaded from data/wfs.`);

    let countDifferences = 0;

    for (const collection of collections) {
      const overwrite = getOverwrite(collection.namespace, collection.name);
      if ( ! overwrite ) {
        console.log(`[${collection.id}] OK (no overwrite)`);
        continue;
      }

      const differences = compare(collection, overwrite);
      if ( differences.length == 0 ){
        console.log(`[${collection.id}] OK (no difference between local WFS and overwrite)`);
      }else{
        countDifferences += differences.length
        console.error(`[${collection.id}] KO (differences between local WFS and overwrite) :`);
        for (const difference of differences) {
          console.error(`[${collection.id}] - ${difference}`);
        }
      }
    }

    if (countDifferences > 0) {
      console.error(`Failure : Found ${countDifferences} differences between local WFS snapshots and overwrites. Please update the overwrites to match data/wfs collections.`);
      process.exitCode = 1;
    }else{
      console.log('Success : No difference found between local WFS snapshots and overwrites.');
    }
  })


program
  .command('update-namespaces')
  .description('Update the namespaces.csv file with the WFS namespaces with metadata')
  .action(async () => {
    console.log('Updating namespaces.csv file with the WFS namespaces with metadata...');

    const namespaceFilterRules = getNamespaceFilters();
    console.log(`${namespaceFilterRules.length} filters loaded from data/namespace-filters.yaml.`);

    // Get collection without properties to speed up the process
    const collections = await getCollections(GPF_WFS_URL, { withProperties: false });
    const namespaces = [...new Set(collections.map((c) => c.namespace))];
    namespaces.sort();

    const fileStream = createWriteStream(join(getDataDir(), 'namespaces.csv'));
    const stream = format({ delimiter: ',' });
    stream.pipe(fileStream);

    stream.write([
      'NAMESPACE',
      'PRODUCT',
      'IGNORED',
      'IGNORED_REASON',
      'COLLECTIONS',
    ])
    for (const namespace of namespaces) {
      const metadata = getMetadataFromNamespace(namespace, namespaceFilterRules);
      stream.write([
        namespace,
        metadata.product,
        metadata.ignored,
        metadata.ignoredReason,
        collections.filter((c) => c.namespace === namespace).map((c) => c.name).join('|'),
      ]);
    }
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
      stream.on('error', reject);
      stream.end();
    });
  })

program
  .command('search')
  .description('Search the local collection catalog with the default MiniSearch options')
  .argument('<query...>', 'Search query')
  .option('-l, --limit <number>', 'Maximum number of results to display', '10')
  .action((queryParts: string[], options: { limit: string }) => {
    const limit = Number.parseInt(options.limit, 10);
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error(`Invalid limit '${options.limit}': expected a non-negative integer`);
    }

    const query = queryParts.join(' ').trim();
    if (query.length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const collections = loadCollections();
    const engine = new MiniSearchCollectionSearchEngine(collections);

    const matches = engine.searchDetailed(query).slice(0, limit);
    for (const line of renderSearchOutputs(engine, query, matches)) {
      console.log(line);
    }
  })

program
  .command('render-catalog')
  .description('Write the merged catalog collections to an output directory')
  .argument('<outputDir>', 'Output directory for merged collection JSON files')
  .option('--clean', 'Remove the output directory before writing')
  .action((outputDir: string, options: { clean?: boolean }) => {
    console.log('Loading merged collections from the local catalog...');
    const collections = loadCollections();
    console.log(`${collections.length} merged collections loaded from the local catalog.`);

    console.log(`Writing merged collections to ${outputDir}/{namespace}/{name}.json...`);
    const resolvedOutputDir = writeRenderedCatalog(collections, outputDir, {
      clean: options.clean,
    });

    console.log(`Success : ${collections.length} merged collections written to ${resolvedOutputDir}.`);
  })

program.action(() => {
  console.log('gpf-schema-store - CLI ready. Use --help for options.')
})

if (process.argv.slice(2).length === 0) {
  program.help()
}

await program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
