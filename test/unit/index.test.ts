import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/enrichment/load-enriched-collections', () => ({
  loadEnrichedCollections: vi.fn(),
}))

import { getCollectionCatalog } from '@/index';
import { loadEnrichedCollections } from '@/enrichment/load-enriched-collections';
import type { EnrichedCollection } from '@/pivot/types';
import type { CollectionSearchEngine } from '@/search/types';

const loadEnrichedCollectionsMock = vi.mocked(loadEnrichedCollections);

const BATIMENT: EnrichedCollection = {
  id: 'BDTOPO_V3:batiment',
  namespace: 'BDTOPO_V3',
  name: 'batiment',
  title: 'Bâtiments',
  description: 'Bâtiments de la BD TOPO.',
  properties: [],
};

class SingleMatchEngine implements CollectionSearchEngine {
  private readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  search() {
    return [{ id: this.id }];
  }
}

describe('getCollectionCatalog', () => {

  beforeEach(() => {
    loadEnrichedCollectionsMock.mockReturnValue([BATIMENT]);
  });

  describe('getCollectionCatalog with searchEngine', () => {

    it('create the expected catalog with search capabilities', () => {
      const searchEngine = new SingleMatchEngine('BDTOPO_V3:batiment');
      const catalog = getCollectionCatalog({ searchEngine });

      expect(catalog.getById('BDTOPO_V3:batiment')).to.not.be.null;

      const ids = catalog.search('bâtiments bdtopo', {
        limit: 10,
      }).map((result) => result.id);

      expect(ids).toContain('BDTOPO_V3:batiment');
    });

  });


  describe('getCollectionCatalog with miniSearch', () => {

    it('create a catalog with a configured MiniSearch engine', () => {
      const catalog = getCollectionCatalog({ miniSearch: {
        fields: ['namespace', 'name']
      } });

      const ids = catalog.search('bâtiments bdtopo', {
        limit: 10,
      }).map((result) => result.id);

      expect(ids).toContain('BDTOPO_V3:batiment');
    });

  });


  describe('getCollectionCatalog with searchEngine and miniSearch', () => {

    it('throws as searchEngine and miniSearch are mutually exclusive', () => {
      expect(() => {
        getCollectionCatalog({
          searchEngine: new SingleMatchEngine('BDTOPO_V3:batiment'),
          miniSearch: {
            fields: ['title'],
          },
        });
      }).toThrow('miniSearch and searchEngine options are mutually exclusive: provide at most one.');
    });

  });

});
