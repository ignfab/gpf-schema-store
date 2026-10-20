import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { dumpDatasets, parseDatasets } from '@/helpers/datasets';
import type { DatasetsConfig } from './types';
import { getDataDir } from './data-dir';

/*
 * =============================================================================
 * Datasets configuration storage (config/datasets.yaml)
 * =============================================================================
 */

export function getDatasetsConfigPath(): string {
  return join(dirname(getDataDir()), 'config', 'datasets.yaml');
}

export type LoadDatasetsConfigOptions = {
  /**
   * Returns an empty configuration when the file does not exist.
   */
  allowMissing?: boolean;
};

export function loadDatasetsConfig(options: LoadDatasetsConfigOptions = {}): DatasetsConfig {
  const datasetsPath = getDatasetsConfigPath();
  if (!existsSync(datasetsPath)) {
    if (options.allowMissing) {
      return { datasets: [] };
    }
    throw new Error(`Could not load datasets: ${datasetsPath} does not exist`);
  }

  return parseDatasets(readFileSync(datasetsPath, 'utf-8'));
}

export function writeDatasetsConfig(config: DatasetsConfig): void {
  const datasetsPath = getDatasetsConfigPath();
  mkdirSync(dirname(datasetsPath), { recursive: true });
  writeFileSync(datasetsPath, dumpDatasets(config));
}
