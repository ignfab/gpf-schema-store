import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/*
 * =============================================================================
 * Local data directory resolution
 * =============================================================================
 */

function resolveDataDir(): string {

  // The data directory is expected to be located at a fixed relative path from this file,
  // either src/local-data/data-dir.ts or dist/local-data/data-dir.js
  let dir = dirname(fileURLToPath(import.meta.url));

  const start = dir;
  while (true) {
    const candidate = join(dir, 'data');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error(`Could not resolve data directory (started from ${start})`);
}

const DATA_DIR = resolveDataDir();

export function getDataDir(): string {
  return DATA_DIR;
}
