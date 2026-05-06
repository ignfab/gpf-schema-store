import { describe, expect, it } from 'vitest';
import type { EnrichedCollection } from '../../../src/types';
import { MiniSearchCollectionSearchEngine } from '../../../src/search/minisearch-engine';

const COLLECTIONS: EnrichedCollection[] = [
  {
    id: 'NS:alpha',
    namespace: 'NS',
    name: 'alpha',
    title: 'foo',
    description: 'bar',
    properties: [
      {
        name: 'id',
        type: 'string',
      },
    ],
  },
  {
    id: 'NS:beta',
    namespace: 'NS',
    name: 'beta',
    title: 'foo',
    description: 'baz',
    properties: [
      {
        name: 'viaduct_code',
        type: 'string',
        title: 'Viaduc code',
      },
    ],
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
    const engine = new MiniSearchCollectionSearchEngine(COLLECTIONS, {
      defaultSearchOptions: {
        fuzzy: 0,
        boost: { description: 20, propertyTitles: 0.1 },
      },
    });

    const defaultMatches = engine.search('bar viaduc');
    const overriddenMatches = engine.search('bar viaduc', {
      boost: { description: 0.1, propertyTitles: 20 },
    });

    expect(defaultMatches.map((match) => match.id)).toEqual(['NS:alpha', 'NS:beta']);
    expect(overriddenMatches.map((match) => match.id)).toEqual(['NS:beta', 'NS:alpha']);
  });
});

describe('MiniSearchCollectionSearchEngine identifier token indexing', () => {
  const IDENTIFIER_COLLECTIONS: EnrichedCollection[] = [
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
      properties: [{ name: 'hauteur', type: 'float' }],
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

describe('MiniSearchCollectionSearchEngine search document indexing', () => {
  it('indexes property descriptions in the propertyDescriptions field', () => {
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
      defaultSearchOptions: { fuzzy: 0, fields: ['propertyDescriptions'] },
    });

    const matches = engine.search('adresse');

    expect(matches.map((match) => match.id)).toEqual(['NS:address']);
  });

  it('indexes oneOf titles and represented features as first-class search signals', () => {
    const engine = new MiniSearchCollectionSearchEngine([
      {
        id: 'NS:bridge',
        namespace: 'NS',
        name: 'bridge',
        title: 'Bridge',
        description: 'Bridge layer',
        properties: [
          {
            name: 'nature',
            type: 'string',
            oneOf: [
              {
                const: 'PONT',
                title: 'Pont',
                'x-ign-representedFeatures': ['Viaduc'],
              },
            ],
          },
        ],
      },
    ], {
      defaultSearchOptions: { fuzzy: 0 },
    });

    expect(engine.search('pont').map((match) => match.id)).toEqual(['NS:bridge']);
    expect(engine.search('viaduc').map((match) => match.id)).toEqual(['NS:bridge']);
  });
});
