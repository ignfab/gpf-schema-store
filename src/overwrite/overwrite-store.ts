import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import type { CollectionOverwrite } from '../types';
import { getDataDir } from '../local-data/data-dir';
import { parseOverwrite } from './overwrite';

/*
 * =============================================================================
 * Overwrite storage
 * =============================================================================
 */

export function loadCollectionOverwrite(namespace: string, name: string): CollectionOverwrite | null {
  const overwritePath = join(getDataDir(), 'overwrites', namespace, `${name}.json`);
  if (!existsSync(overwritePath)) {
    return null;
  }

  const raw = JSON.parse(readFileSync(overwritePath, 'utf-8')) as unknown;
  return parseOverwrite(raw, overwritePath);
}
