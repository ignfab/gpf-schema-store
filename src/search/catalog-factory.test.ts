import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../index';
import type { CollectionSearchEngine } from './types';

class SingleMatchEngine implements CollectionSearchEngine {
  private readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  search() {
    return [{ id: this.id }];
  }
}

describe('getCollectionCatalog search engine configuration', () => {
  it('uses an injected search engine', () => {
    const catalog = getCollectionCatalog({
      engine: new SingleMatchEngine('BDTOPO_V3:batiment'),
    });

    const ids = catalog.searchWithScores('ignored').map((result) => result.id);

    expect(ids).toEqual(['BDTOPO_V3:batiment']);
  });

  it('builds the search engine with engineFactory', () => {
    let collectionCount = 0;
    const catalog = getCollectionCatalog({
      engineFactory: (items) => {
        collectionCount = items.length;
        return new SingleMatchEngine('ADMINEXPRESS-COG.LATEST:commune');
      },
    });

    const ids = catalog.searchWithScores('ignored').map((result) => result.id);

    expect(collectionCount).toBeGreaterThan(0);
    expect(ids).toEqual(['ADMINEXPRESS-COG.LATEST:commune']);
  });

  it('rejects engine and engineFactory together at runtime', () => {
    expect(() =>
      getCollectionCatalog({
        engine: new SingleMatchEngine('BDTOPO_V3:batiment'),
        engineFactory: () => new SingleMatchEngine('BDTOPO_V3:batiment'),
      } as never),
    ).toThrow('Cannot specify both engine and engineFactory options');
  });
});
