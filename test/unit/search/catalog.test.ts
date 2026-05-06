import { describe, expect, it } from 'vitest';
import { renderCollectionSchema } from '../../../src/renderers/collection-schema';
import type { EnrichedCollection } from '../../../src/types';
import { InMemoryCollectionCatalog } from '../../../src/search/catalog';
import type { CollectionSearchEngine, CollectionSearchMatch } from '../../../src/search/types';

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
const SCHEMAS = FIXTURES.map((collection) => renderCollectionSchema(collection));

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

    const titles = catalog.search('ordered').map((schema) => schema.title);
    expect(titles).toEqual(['Third', 'First']);
  });

  it('applies limit at catalog level', () => {
    const engine = new StubSearchEngine({
      many: ['NS:third', 'NS:second', 'NS:first'],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    const titles = catalog.search('many', { limit: 2 }).map((schema) => schema.title);
    expect(titles).toEqual(['Third', 'Second']);
  });

  it('returns OGC schemas from search', () => {
    const engine = new StubSearchEngine({
      scored: [{ id: 'NS:first', score: 4.2 }],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    expect(catalog.search('scored')).toEqual([SCHEMAS[0]]);
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
      { id: 'NS:third', collection: SCHEMAS[2], score: 3.5 },
      { id: 'NS:first', collection: SCHEMAS[0], score: 1.2 },
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
      { id: 'NS:third', collection: SCHEMAS[2], score: 3 },
      { id: 'NS:second', collection: SCHEMAS[1], score: 2 },
    ]);
  });

  it('returns cloned collections from scored search results', () => {
    const engine = new StubSearchEngine({
      scored: [{ id: 'NS:first', score: 4.2 }],
    });
    const catalog = new InMemoryCollectionCatalog(FIXTURES, { engine });

    const [result] = catalog.searchWithScores('scored');
    result.collection.title = 'Mutated title';
    result.collection.properties.id.type = 'number';

    expect(catalog.searchWithScores('scored')).toEqual([
      {
        id: 'NS:first',
        collection: SCHEMAS[0],
        score: 4.2,
      },
    ]);
  });

  it('returns cloned values from list and getById', () => {
    const catalog = new InMemoryCollectionCatalog(FIXTURES);

    const listed = catalog.list();
    listed[0].title = 'Mutated title';
    listed[0].properties.id.type = 'number';

    const listedAgain = catalog.list();
    expect(listedAgain[0].title).toBe('First');
    expect(listedAgain[0].properties.id.type).toBe('string');

    const first = catalog.getById('NS:first');
    expect(first).toBeDefined();
    if (!first) {
      return;
    }
    first.title = 'Mutated again';

    const firstAgain = catalog.getById('NS:first');
    expect(firstAgain?.title).toBe('First');
  });

  it('throws when searching without a configured search engine', () => {
    const catalog = new InMemoryCollectionCatalog(FIXTURES);

    expect(() => catalog.search('anything')).toThrow('No search engine configured');
  });
});
