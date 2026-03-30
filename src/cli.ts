import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { getCollections } from './services/wfs'
import { getOverwrite, saveCollections, writeWfsCollection } from './services/storage'
import { merge } from './helpers/merge'

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
    const collections = await getCollections(GPF_WFS_URL);
    for ( const collection of collections) {
      writeWfsCollection(collection);
    }
    console.log(`${collections.length} collections saved to data/wfs/{namespace}/{name}.json`);
  })

program.action(() => {
  console.log('gpf-schema-store - CLI ready. Use --help for options.')
})

if (process.argv.slice(2).length === 0) {
  program.help()
}

program.parse()
