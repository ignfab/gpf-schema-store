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
    properties: [{ name: 'id', type: 'string', enum: [' Viaduc ', 'Pont', '', 'Viaduc'] }],
  },
  {
    id: 'NS:beta',
    namespace: 'NS',
    name: 'beta',
    title: 'foo',
    description: 'baz',
    properties: [{ name: 'viaduct_code', type: 'string', title: 'Viaduc code' }],
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

describe('MiniSearchCollectionSearchEngine enum values indexing', () => {
  it('finds a collection by an enum value of one of its properties', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, { fuzzy: 0 });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toContain('NS:alpha');
  });

  it('does not match a collection with no matching enum value', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, { fuzzy: 0 });
    const matches = engine.search('Pont');
    expect(matches.map((m) => m.id)).not.toContain('NS:beta');
  });

  it('normalizes enum values before indexing', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, { fuzzy: 0 });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toEqual(['NS:alpha', 'NS:beta']);
  });

  it('uses the public boost.enums option for enum ranking', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      fuzzy: 0,
      boost: { enums: 1.8, properties: 1.3 },
    });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toEqual(['NS:alpha', 'NS:beta']);
  });
});
