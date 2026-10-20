import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

import {
  zSourceCollection,
  type SourceCollection
} from './types';
import { formatSchemaIssues } from '@/helpers/zod';
import { getDataDir } from '@/config/data-dir';
import { replaceDirectory } from '@/helpers/replace-directory';

/*
 * =============================================================================
 * Source collection storage
 * =============================================================================
 *
 * This module owns the local WFS snapshot layout under data/wfs.
 */

function parseSourceCollection(raw: unknown, context: string): SourceCollection {
  const result = zSourceCollection.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid source collection ${context}: ${formatSchemaIssues(result.error)}`);
  }
  return result.data;
}

export function loadSourceCollections(): SourceCollection[] {
  const wfsRoot = join(getDataDir(), 'wfs');
  if (!existsSync(wfsRoot)) {
    throw new Error(`Could not load collections: ${wfsRoot} does not exist`);
  }

  const namespaces = readdirSync(wfsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const collections: SourceCollection[] = [];
  for (const namespace of namespaces) {
    const namespacePath = join(wfsRoot, namespace);
    const files = readdirSync(namespacePath)
      .filter((file) => file.endsWith('.json'))
      .sort();

    for (const file of files) {
      const filePath = join(namespacePath, file);
      const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
      collections.push(parseSourceCollection(raw, filePath));
    }
  }

  return collections;
}

function writeSourceCollectionToRoot(root: string, collection: SourceCollection): void {
  const namespaceDirPath = join(root, collection.namespace);
  if (!existsSync(namespaceDirPath)) {
    mkdirSync(namespaceDirPath, { recursive: true });
  }

  const collectionPath = join(namespaceDirPath, `${collection.name}.json`);
  writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
}

export function writeSourceCollection(collection: SourceCollection): void {
  writeSourceCollectionToRoot(join(getDataDir(), 'wfs'), collection);
}

export function replaceSourceCollections(collections: SourceCollection[]): void {
  if (collections.length === 0) {
    throw new Error('Refusing to replace data/wfs with an empty collection snapshot');
  }

  replaceDirectory(getDataDir(), 'wfs', (wfsRoot) => {
    for (const collection of collections) {
      writeSourceCollectionToRoot(wfsRoot, collection);
    }
  });
}

export function clearSourceCollections(): void {
  const wfsRoot = join(getDataDir(), 'wfs');
  rmSync(wfsRoot, { recursive: true, force: true });
  mkdirSync(wfsRoot, { recursive: true });
}
