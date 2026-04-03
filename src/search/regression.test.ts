import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../index';
import { MiniSearchCollectionSearchEngine } from './minisearch-engine';
import type { CollectionSearchEngine } from './types';

class SingleMatchEngine implements CollectionSearchEngine {
  search(_query: string) {
    return [{ id: 'BDTOPO_V3:batiment' }];
  }
}

describe('search regression (real dataset)', () => {
  const catalog = getCollectionCatalog();

  it("finds BDTOPO_V3:batiment for 'bâtiments bdtopo'", () => {
    const ids = catalog.search('bâtiments bdtopo').map((collection) => collection.id);
    expect(ids).toContain('BDTOPO_V3:batiment');
  });

  it("finds departments for 'départements'", () => {
    const ids = catalog.search('départements').map((collection) => collection.id);
    expect(ids).toContain('BDTOPO_V3:departement');
    expect(ids).toContain('ADMINEXPRESS-COG.LATEST:departement');
  });

  it('allows overriding the search engine', () => {
    const overridden = getCollectionCatalog({
      engine: new SingleMatchEngine(),
    });
    const ids = overridden.search('ignored').map((collection) => collection.id);
    expect(ids).toEqual(['BDTOPO_V3:batiment']);
  });

  it('supports custom MiniSearch ranking options via engineFactory', () => {
    const tuned = getCollectionCatalog({
      engineFactory: (items) =>
        new MiniSearchCollectionSearchEngine(items, {
          defaultSearchOptions: {
            fuzzy: 0.1,
            boost: { title: 4.0 },
          },
        }),
    });
    const ids = tuned.search('bâtiments bdtopo').map((collection) => collection.id);
    expect(ids).toContain('BDTOPO_V3:batiment');
  });
});
