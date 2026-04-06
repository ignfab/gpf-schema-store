import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Collection } from '../types';

export interface RenderCatalogOptions {
  clean?: boolean;
}

export function writeRenderedCatalog(
  collections: Collection[],
  outputDir: string,
  options: RenderCatalogOptions = {},
): string {
  const resolvedOutputDir = resolve(outputDir);

  if (options.clean) {
    rmSync(resolvedOutputDir, { recursive: true, force: true });
  }

  mkdirSync(resolvedOutputDir, { recursive: true });

  for (const collection of collections) {
    const namespaceDir = join(resolvedOutputDir, collection.namespace);
    mkdirSync(namespaceDir, { recursive: true });
    writeFileSync(
      join(namespaceDir, `${collection.name}.json`),
      `${JSON.stringify(collection, null, 2)}\n`,
    );
  }

  return resolvedOutputDir;
}
