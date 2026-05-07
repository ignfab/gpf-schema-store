import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import type { EnrichedCollection } from '../types';
import { renderCollectionSchema } from '../renderers/collection-schema';

export interface RenderCatalogOptions {
  clean?: boolean;
}

// This is intentionally stupid but simple: block the obvious project-owned
// top-level directories instead of trying to prove the output path is safe.
const PROTECTED_TOP_LEVEL_DIRS = new Set([
  'src',
  'data',
  'dist',
  'node_modules',
  'coverage',
  '.github',
  '.git',
]);

const ALLOWED_CLEAN_PATH_PREFIXES = [
  ['data', 'catalog'],
] as const;

function assertSafeCleanTarget(outputDir: string): void {
  const cwd = process.cwd();
  const relativePath = relative(cwd, outputDir);

  if (relativePath === '') {
    throw new Error(`Refusing to clean project root: ${outputDir}`);
  }

  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Refusing to clean outside the current project: ${outputDir}`);
  }

  const pathSegments = relativePath.split(sep);
  const isAllowedCleanPath = ALLOWED_CLEAN_PATH_PREFIXES.some((prefix) =>
    prefix.every((segment, index) => pathSegments[index] === segment),
  );
  if (isAllowedCleanPath) {
    return;
  }

  const topLevelDir = pathSegments[0];
  if (PROTECTED_TOP_LEVEL_DIRS.has(topLevelDir)) {
    throw new Error(`Refusing to clean protected project directory: ${outputDir}`);
  }
}

export function writeRenderedCatalog(
  collections: EnrichedCollection[],
  outputDir: string,
  options: RenderCatalogOptions = {},
): string {
  const resolvedOutputDir = resolve(outputDir);

  if (options.clean) {
    assertSafeCleanTarget(resolvedOutputDir);
    rmSync(resolvedOutputDir, { recursive: true, force: true });
  }

  mkdirSync(resolvedOutputDir, { recursive: true });

  for (const collection of collections) {
    const namespaceDir = join(resolvedOutputDir, collection.namespace);
    mkdirSync(namespaceDir, { recursive: true });
    writeFileSync(
      join(namespaceDir, `${collection.name}.json`),
      `${JSON.stringify(renderCollectionSchema(collection), null, 2)}\n`,
    );
  }

  return resolvedOutputDir;
}
