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
  it('keeps the generic search result lightweight', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });

    const [firstMatch] = engine.search('bar');

    expect(firstMatch).toEqual({
      id: 'NS:alpha',
      score: expect.any(Number),
    });
  });

  it('returns MiniSearch match metadata from searchDetailed', () => {
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });

    const [firstMatch] = engine.searchDetailed('bar');

    expect(firstMatch?.queryTerms).toEqual(['bar']);
    expect(firstMatch?.terms).toEqual(['bar']);
    expect(firstMatch?.match).toEqual({
      bar: ['description'],
    });
  });

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

describe('MiniSearchCollectionSearchEngine identifier token indexing', () => {
  const IDENTIFIER_COLLECTIONS: Collection[] = [
    {
      id: 'ADMINEXPRESS-COG.LATEST:chef_lieu_de_commune',
      namespace: 'ADMINEXPRESS-COG.LATEST',
      name: 'chef_lieu_de_commune',
      title: 'Chef-lieu de commune',
      description: 'Chef-lieu de commune',
      properties: [{ name: 'code_insee', type: 'string', description: 'Code INSEE de la commune' }],
    },
    {
      id: 'BDTOPO_V3:batiment',
      namespace: 'BDTOPO_V3',
      name: 'batiment',
      title: 'Batiment',
      description: 'Batiment',
      properties: [{ name: 'hauteur', type: 'number' }],
    },
    {
      id: 'ADMINEXPRESS-COG.LATEST:commune',
      namespace: 'ADMINEXPRESS-COG.LATEST',
      name: 'commune',
      title: 'Commune',
      description: 'Commune',
      properties: [{ name: 'nom', type: 'string' }],
    },
  ];

  it('matches underscore-separated names from natural tokenized queries', () => {
    const engine = new MiniSearchCollectionSearchEngine(IDENTIFIER_COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });

    const matches = engine.search('chef lieu commune');

    expect(matches[0]?.id).toBe('ADMINEXPRESS-COG.LATEST:chef_lieu_de_commune');
  });

  it('matches namespace and type tokens from technical identifiers', () => {
    const engine = new MiniSearchCollectionSearchEngine(IDENTIFIER_COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });

    const matches = engine.search('bdtopo batiment');

    expect(matches[0]?.id).toBe('BDTOPO_V3:batiment');
  });

  it('matches tokenized namespace variants like latest and product family', () => {
    const engine = new MiniSearchCollectionSearchEngine(IDENTIFIER_COLLECTIONS, {
      defaultSearchOptions: { fuzzy: 0 },
    });

    const matches = engine.search('adminexpress latest commune');

    expect(matches[0]?.id).toBe('ADMINEXPRESS-COG.LATEST:commune');
  });
});

describe('MiniSearchCollectionSearchEngine property description indexing', () => {
  it('indexes property descriptions in the properties field', () => {
    const engine = new MiniSearchCollectionSearchEngine([
      {
        id: 'NS:address',
        namespace: 'NS',
        name: 'address',
        title: 'Address',
        description: 'Address layer',
        properties: [
          {
            name: 'line',
            type: 'string',
            description: 'Adresse postale normalisee',
          },
        ],
      },
      {
        id: 'NS:other',
        namespace: 'NS',
        name: 'other',
        title: 'Other',
        description: 'Other layer',
        properties: [{ name: 'line', type: 'string' }],
      },
    ], {
      defaultSearchOptions: { fuzzy: 0, fields: ['properties'] },
    });

    const matches = engine.search('adresse');

    expect(matches.map((match) => match.id)).toEqual(['NS:address']);
  });
});
