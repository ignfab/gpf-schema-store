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
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });
    const matches = engine.search('foo bar', { combineWith: 'AND' });
    expect(matches.map((match) => match.id)).toEqual(['NS:alpha']);
  });

  it('supports fields filter', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS);
    const matches = engine.search('bar', { fields: ['title'] });
    expect(matches).toEqual([]);
  });

  it('merges default search options with per-query overrides', () => {
    const mergeCollections: Collection[] = [
      {
        id: 'NS:alpha-merge',
        namespace: 'NS',
        name: 'alpha-merge',
        title: 'foo',
        description: 'baz',
        properties: [{ name: 'id', type: 'string', enum: ['Viaduc'] }],
      },
      {
        id: 'NS:beta-merge',
        namespace: 'NS',
        name: 'beta-merge',
        title: 'foo',
        description: 'baz',
        properties: [{ name: 'viaduct_code', type: 'string', title: 'Viaduc code' }],
      },
    ];

    const engine = new MiniSearchCollectionSearchEngine(mergeCollections, {
      defaultSearchOptions: {
        fuzzy: 0,
        combineWith: 'AND',
        boost: { description: 1, properties: 2, enums: 0.1 },
      },
    });

    const defaultMatches = engine.search('Viaduc baz');
    const overriddenMatches = engine.search('Viaduc baz', {
      boost: { enums: 20 },
    });

    expect(defaultMatches.map((match) => match.id)).toEqual(['NS:beta-merge', 'NS:alpha-merge']);
    expect(overriddenMatches.map((match) => match.id)).toEqual(['NS:alpha-merge', 'NS:beta-merge']);
  });
});

describe('MiniSearchCollectionSearchEngine enum values indexing', () => {
  it('finds a collection by an enum value of one of its properties', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toContain('NS:alpha');
  });

  it('does not match a collection with no matching enum value', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });
    const matches = engine.search('Pont');
    expect(matches.map((m) => m.id)).not.toContain('NS:beta');
  });

  it('normalizes enum values before indexing', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toEqual(['NS:alpha', 'NS:beta']);
  });

  it('uses the public boost.enums option for enum ranking', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: {
        fuzzy: 0,
        boost: { enums: 1.8, properties: 1.3 },
      },
    });
    const matches = engine.search('Viaduc');
    expect(matches.map((m) => m.id)).toEqual(['NS:alpha', 'NS:beta']);
  });
});
