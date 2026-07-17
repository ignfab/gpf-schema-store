import { describe, expect, it } from 'vitest';
import type { EnrichedCollection } from '@/pivot/types';
import { InMemoryCollectionCatalog } from '@/catalog/in-memory';
import type { CollectionSearchEngine, CollectionSearchMatch, CollectionSearchOptions } from '@/search/types';

const FIXTURES: EnrichedCollection[] = [
  {
    id: 'NS:first',
    namespace: 'NS',
    name: 'first',
    title: 'First',
    description: 'First collection',
    properties: [{ name: 'id', type: 'string' }],
  },
  {
    id: 'NS:second',
    namespace: 'NS',
    name: 'second',
    title: 'Second',
    description: 'Second collection',
    properties: [{ name: 'id', type: 'string' }],
  },
  {
    id: 'NS:third',
    namespace: 'NS',
    name: 'third',
    title: 'Third',
    description: 'Third collection',
    properties: [{ name: 'id', type: 'string' }],
  },
];

class StubSearchEngine implements CollectionSearchEngine {
  private readonly matchesByQuery: Record<string, CollectionSearchMatch[]>;

  constructor(matchesByQuery: Record<string, Array<string | CollectionSearchMatch>>) {
    this.matchesByQuery = Object.fromEntries(
      Object.entries(matchesByQuery).map(([query, matches]) => [
        query,
        matches.map((match) => (typeof match === 'string' ? { id: match } : match)),
      ]),
    );
  }

  search(query: string, options?: CollectionSearchOptions) {
    const matches = this.matchesByQuery[query] || [];
    if (options?.limit === undefined) {
      return matches;
    }
    return matches.slice(0, Math.max(0, options.limit));
  }
}

class NullSearchEngine implements CollectionSearchEngine {
  search(_: string): CollectionSearchMatch[] {
    return [];
  }
}


describe('InMemoryCollectionCatalog', () => {

  describe('list', () => {

    it('returns all the elements', () => {
      const catalog = new InMemoryCollectionCatalog(FIXTURES, new NullSearchEngine());
      const collections = catalog.list();
      expect(collections.length).toEqual(3);
    });

    it('returns cloned values from list', () => {
      const catalog = new InMemoryCollectionCatalog(FIXTURES, new NullSearchEngine());

      const listed = catalog.list();
      listed[0].title = 'Mutated title';
      listed[0].description = 'Mutated description';

      const listedAgain = catalog.list();
      expect(listedAgain[0].title).toBe('First');
      expect(listedAgain[0].description).toBe('First collection');
    });

  });


  describe('getCollectionSchema', () => {

    it("returns null if the type doesn't exists", () => {
      const catalog = new InMemoryCollectionCatalog(FIXTURES, new NullSearchEngine());
      const collection = catalog.getCollectionSchema('NS:not_found');
      expect(collection).toBeUndefined();
    });

    it('returns cloned values from getCollectionSchema', () => {
      const catalog = new InMemoryCollectionCatalog(FIXTURES, new NullSearchEngine());

      const first = catalog.getCollectionSchema('NS:first');
      expect(first).toBeDefined();
      if (!first) {
        return;
      }
      first.title = 'Mutated again';

      const firstAgain = catalog.getCollectionSchema('NS:first');
      expect(firstAgain?.title).toBe('First');
    });

  });


  describe('search', () => {
    it('returns search matches from the search engine', () => {
      const SCORED = [{ id: 'NS:first', score: 4.2 }];
      const engine = new StubSearchEngine({
        scored: SCORED,
      });
      const catalog = new InMemoryCollectionCatalog(FIXTURES, engine);

      expect(catalog.search('scored')).toEqual(SCORED);
    });
  });


});
