import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import { InMemoryCollectionCatalog } from './catalog';
import type { CollectionSearchEngine, CollectionSearchMatch } from './types';

const FIXTURES: Collection[] = [
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

  search(query: string) {
    return this.matchesByQuery[query] || [];
  }
}

describe('InMemoryCollectionCatalog', () => {
  it('keeps engine order and ignores unknown ids', () => {
    const engine = new StubSearchEngine({
      ordered: ['NS:third', 'NS:unknown', 'NS:first'],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    const ids = catalog.search('ordered').map((collection) => collection.id);
    expect(ids).toEqual(['NS:third', 'NS:first']);
  });

  it('applies limit at catalog level', () => {
    const engine = new StubSearchEngine({
      many: ['NS:third', 'NS:second', 'NS:first'],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    const ids = catalog.search('many', { limit: 2 }).map((collection) => collection.id);
    expect(ids).toEqual(['NS:third', 'NS:second']);
  });

  it('returns plain collections from search for compatibility', () => {
    const engine = new StubSearchEngine({
      scored: [{ id: 'NS:first', score: 4.2 }],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    expect(catalog.search('scored')).toEqual([FIXTURES[0]]);
  });

  it('propagates score while preserving order and ignoring unknown ids', () => {
    const engine = new StubSearchEngine({
      ordered: [
        { id: 'NS:third', score: 3.5 },
        { id: 'NS:unknown', score: 3.4 },
        { id: 'NS:first', score: 1.2 },
      ],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    expect(catalog.searchWithScores('ordered')).toEqual([
      { collection: FIXTURES[2], score: 3.5 },
      { collection: FIXTURES[0], score: 1.2 },
    ]);
  });

  it('applies limit to scored results', () => {
    const engine = new StubSearchEngine({
      many: [
        { id: 'NS:third', score: 3 },
        { id: 'NS:second', score: 2 },
        { id: 'NS:first', score: 1 },
      ],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    expect(catalog.searchWithScores('many', { limit: 2 })).toEqual([
      { collection: FIXTURES[2], score: 3 },
      { collection: FIXTURES[1], score: 2 },
    ]);
  });

  it('returns cloned collections from scored search results', () => {
    const engine = new StubSearchEngine({
      scored: [{ id: 'NS:first', score: 4.2 }],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    const [result] = catalog.searchWithScores('scored');
    result.collection.title = 'Mutated title';
    result.collection.properties[0].type = 'float';

    expect(catalog.searchWithScores('scored')).toEqual([
      {
        collection: FIXTURES[0],
        score: 4.2,
      },
    ]);
  });

  it('returns cloned values from list and getById', () => {
    const catalog = new InMemoryCollectionCatalog(FIXTURES);

    const listed = catalog.list();
    listed[0].title = 'Mutated title';
    listed[0].properties[0].type = 'float';

    const listedAgain = catalog.list();
    expect(listedAgain[0].title).toBe('First');
    expect(listedAgain[0].properties[0].type).toBe('string');

    const first = catalog.getById('NS:first');
    expect(first).toBeDefined();
    if (!first) {
      return;
    }
    first.title = 'Mutated again';

    const firstAgain = catalog.getById('NS:first');
    expect(firstAgain?.title).toBe('First');
  });
});
