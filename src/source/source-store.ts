import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

import type { SourceCollection } from '../types';
import { getDataDir } from '../local-data/data-dir';

/*
 * =============================================================================
 * Source collection storage
 * =============================================================================
 *
 * This module owns the local WFS snapshot layout under data/wfs.
 */

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
      collections.push(JSON.parse(readFileSync(filePath, 'utf-8')) as SourceCollection);
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

  const dataDir = getDataDir();
  const wfsRoot = join(dataDir, 'wfs');
  const nextRoot = join(dataDir, `.wfs-next-${process.pid}-${Date.now()}`);
  const previousRoot = join(dataDir, '.wfs-previous');

  if (!existsSync(wfsRoot) && existsSync(previousRoot)) {
    renameSync(previousRoot, wfsRoot);
  }

  rmSync(nextRoot, { recursive: true, force: true });
  rmSync(previousRoot, { recursive: true, force: true });

  try {
    mkdirSync(nextRoot, { recursive: true });
    for (const collection of collections) {
      writeSourceCollectionToRoot(nextRoot, collection);
    }

    const hadPreviousSnapshot = existsSync(wfsRoot);
    if (hadPreviousSnapshot) {
      renameSync(wfsRoot, previousRoot);
    }

    try {
      renameSync(nextRoot, wfsRoot);
    } catch (error) {
      if (hadPreviousSnapshot) {
        try {
          renameSync(previousRoot, wfsRoot);
        } catch (restoreError) {
          throw new Error(
            `Failed to promote ${nextRoot} to ${wfsRoot} and failed to restore previous snapshot from ${previousRoot}: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
            { cause: error },
          );
        }
      }
      throw error;
    }

    try {
      rmSync(previousRoot, { recursive: true, force: true });
    } catch {
      // The new snapshot is already promoted; retry stale backup cleanup on the next update.
    }
  } catch (error) {
    try {
      rmSync(nextRoot, { recursive: true, force: true });
    } catch {
      // Preserve the original failure; stale temp cleanup can be retried on the next update.
    }
    throw error;
  }
}

export function clearSourceCollections(): void {
  const wfsRoot = join(getDataDir(), 'wfs');
  rmSync(wfsRoot, { recursive: true, force: true });
  mkdirSync(wfsRoot, { recursive: true });
}
