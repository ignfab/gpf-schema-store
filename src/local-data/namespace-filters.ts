import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { loadNamespaceFilters } from '../helpers/namespace-filters';
import type { NamespaceFilterRule } from '../types';
import { getDataDir } from './data-dir';

/*
 * =============================================================================
 * Namespace filter storage
 * =============================================================================
 */

export function getNamespaceFilters(): NamespaceFilterRule[] {
  const namespaceFiltersPath = join(getDataDir(), 'namespace-filters.yaml');
  if (!existsSync(namespaceFiltersPath)) {
    throw new Error(`Could not load namespace filters: ${namespaceFiltersPath} does not exist`);
  }

  const yamlContent = readFileSync(namespaceFiltersPath, 'utf-8');
  return loadNamespaceFilters(yamlContent);
}
