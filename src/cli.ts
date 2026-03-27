import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { getCollections } from './services/wfs'

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }

const program = new Command()

program
  .name('schema-store')
  .description('Application en ligne de commande')
  .version(version)

const GPF_WFS_URL = "https://data.geopf.fr/wfs";

program
  .command('update')
  .description('Update the collections from the GPF WFS (src/data/gpf-collections.json)')
  .action(async () => {
    const collections = await getCollections(GPF_WFS_URL);
    // save collections to src/data/gpf-collections.json
    writeFileSync('src/data/gpf-collections.json', JSON.stringify(collections, null, 2));
    console.log(`${collections.length} collections saved to src/data/gpf-collections.json`);
  })

program.action(() => {
  console.log('schema-store - CLI ready. Use --help for options.')
})

if (process.argv.slice(2).length === 0) {
  program.help()
}

program.parse()
