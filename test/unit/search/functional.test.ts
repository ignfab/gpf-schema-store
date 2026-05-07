import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../../../src/index';

type SearchFunctionalCase = {
  query: string;
  expected: string[];
};

function loadSearchFunctionalCases(): SearchFunctionalCase[] {
  const yamlPath = new URL('./testdata/functional-search-cases.yaml', import.meta.url);
  return load(readFileSync(yamlPath, 'utf-8')) as SearchFunctionalCase[];
}

describe('search functional cases (real dataset)', () => {
  const catalog = getCollectionCatalog();
  const searchCases = loadSearchFunctionalCases();

  for (const searchCase of searchCases) {
    it(`finds expected collections for '${searchCase.query}'`, () => {
      const foundIds = catalog.searchWithScores(searchCase.query).map((result) => result.id);
      for ( const expectedId of searchCase.expected ) {
        expect(
          foundIds,
          `Expected collection ID "${expectedId}" not found in search results for query "${searchCase.query}". Found IDs: ${foundIds.join(', ')}`
        ).toContain(
          expectedId
        );
      }
    });
  }
});
