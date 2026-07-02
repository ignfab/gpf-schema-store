import { describe, it, expect } from 'vitest';
import { getCollectionCatalog } from '@/index';

const QUERY = 'batiment';

describe('search limit', () => {
  it('returns all matching results when no limit is set', () => {
    const results = getCollectionCatalog().search(QUERY);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('use the default limit if defined', () => {
    const unlimited = getCollectionCatalog().search(QUERY);
    expect(unlimited.length > 3); // harden test

    const defaultLimit = unlimited.length - 1;
    const catalog = getCollectionCatalog({ miniSearch: { limit: defaultLimit } });
    const matches = catalog.search(QUERY);
    expect(matches.length).toBe(defaultLimit);
  });

  it('use the query limit if defined', () => {
    const unlimited = getCollectionCatalog().search(QUERY);
    expect(unlimited.length > 3); // harden test

    const limit = unlimited.length - 1;
    const matches = getCollectionCatalog().search(QUERY, { limit });
    expect(matches.length).toBe(limit);
  });

  it('use the query limit if both default limit and query limit are defined', () => {
    const unlimited = getCollectionCatalog().search(QUERY);
    expect(unlimited.length > 3); // harden test

    const defaultLimit = unlimited.length - 2;
    const queryLimit = unlimited.length - 1;
    const catalog = getCollectionCatalog({ miniSearch: { limit: defaultLimit } });
    const matchess = catalog.search(QUERY, {limit: queryLimit});
    expect(matchess.length).toBe(queryLimit);
  });


});