import { describe, expect, it } from 'vitest';
import { getCollectionCatalog } from '../index';
import type { CollectionSearchEngine } from './types';

class SingleMatchEngine implements CollectionSearchEngine {
  search() {
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
});
