import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../../../src/index';
import type { CollectionSearchEngine } from '../../../src/search/types';

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

  it('configures the default MiniSearch engine with public options', () => {
    const catalog = getCollectionCatalog({
      miniSearch: {
        fields: ['title', 'identifierTokens'],
        boost: { title: 4.0 },
        combineWith: 'OR',
        fuzzy: 0.1,
      },
    });

    const ids = catalog.searchWithScores('bâtiments bdtopo', {
      limit: 10,
    }).map((result) => result.id);

    expect(ids).toContain('BDTOPO_V3:batiment');
  });

  it('prefers the injected engine when forced at runtime', () => {
    const catalog = getCollectionCatalog({
        engine: new SingleMatchEngine('BDTOPO_V3:batiment'),
        miniSearch: {
          fields: ['title'],
        },
      } as never);

    const ids = catalog.searchWithScores('ignored').map((result) => result.id);

    expect(ids).toEqual(['BDTOPO_V3:batiment']);
  });
});
