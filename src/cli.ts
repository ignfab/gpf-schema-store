import { createWriteStream, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Command } from 'commander'

import { format } from '@fast-csv/format';

import { getCollections } from './services/wfs'
import { getDataDir, writeWfsCollection, clearWfsCollections, getNamespaceFilters, loadCollections, getOverwrite } from './services/storage'
import { getMetadataFromNamespace } from './helpers/metadata'
import { diff } from 'node:util';
import { compare } from './helpers/compare';

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
  .description('Ensure that overwrites are in sync with the WFS endpoint')
  .action(async () => {
    // load collections from data/wfs and check that they are in sync with the WFS endpoint
    console.log('Loading collections from data/wfs...');
    const collections = loadCollections();
    console.log(`${collections.length} collections loaded from data/wfs.`);

    let countDifferences = 0;

    for (const collection of collections) {
      const overwrite = getOverwrite(collection.namespace, collection.name);
      if ( ! overwrite ) {
        console.log(`[${collection.id}] OK (no overwrite)`);
        continue;
      }

      const differences = compare(collection, overwrite);
      if ( differences.length == 0 ){
        console.log(`[${collection.id}] OK (no difference between WFS and overwrite)`);
      }else{
        countDifferences += differences.length
        console.error(`[${collection.id}] KO (differences between WFS and overwrite) :`);
        for (const difference of differences) {
          console.error(`[${collection.id}] - ${difference}`);
        }
      }
    }

    if (countDifferences > 0) {
      console.error(`Failure : Found ${countDifferences} differences between WFS and overwrites. Please update the overwrites to match the WFS collections.`);
      process.exitCode = 1;
    }else{
      console.log('Success : No difference found between WFS and overwrites.');
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

    const stream = format({ delimiter: ',' });
    stream.pipe(createWriteStream(join(getDataDir(), 'namespaces.csv')));

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
    stream.end();
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
