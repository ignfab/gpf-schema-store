import { readFileSync } from 'node:fs'
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
  .description('Mise à jour des schémas')
  .action(async () => {
    const collections = await getCollections(GPF_WFS_URL);
    for (const collection of collections) {
      console.log(JSON.stringify(collection, null, 2));
      console.log('--------------------------------');
    }
  })

program.action(() => {
  console.log('schema-store — CLI prête. Utilisez --help pour les options.')
})

if (process.argv.slice(2).length === 0) {
  program.help()
}

program.parse()
