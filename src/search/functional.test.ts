import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../index';

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
      const ids = catalog.search(searchCase.query).map((collection) => collection.id);
      expect(ids).toEqual(expect.arrayContaining(searchCase.expected));
    });
  }
});
