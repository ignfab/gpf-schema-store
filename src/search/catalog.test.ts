import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import { InMemoryCollectionCatalog } from './catalog';
import type { CollectionSearchEngine } from './types';

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
  private readonly idsByQuery: Record<string, string[]>;

  constructor(idsByQuery: Record<string, string[]>) {
    this.idsByQuery = idsByQuery;
  }

  search(query: string) {
    return (this.idsByQuery[query] || []).map((id) => ({ id }));
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

  it('returns cloned values from list and getById', () => {
    const catalog = new InMemoryCollectionCatalog(FIXTURES);

    const listed = catalog.list();
    listed[0].title = 'Mutated title';
    listed[0].properties[0].type = 'number';

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
