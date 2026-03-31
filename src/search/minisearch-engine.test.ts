import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import { MiniSearchCollectionSearchEngine } from './minisearch-engine';

const COLLECTIONS: Collection[] = [
  {
    id: 'NS:alpha',
    namespace: 'NS',
    name: 'alpha',
    title: 'foo',
    description: 'bar',
    properties: [{ name: 'id', type: 'string' }],
  },
  {
    id: 'NS:beta',
    namespace: 'NS',
    name: 'beta',
    title: 'foo',
    description: 'baz',
    properties: [{ name: 'id', type: 'string' }],
  },
];

describe('MiniSearchCollectionSearchEngine search options', () => {
  it('supports combineWith=AND', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, { fuzzy: 0 });
    const matches = engine.search('foo bar', { combineWith: 'AND' });
    expect(matches.map((match) => match.id)).toEqual(['NS:alpha']);
  });

  it('supports fields filter', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS);
    const matches = engine.search('bar', { fields: ['title'] });
    expect(matches).toEqual([]);
  });
});
