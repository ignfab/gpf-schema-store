import { describe, expect, it } from 'vitest';

import {
  filterCollectionKeywords,
  getKeywordOccurrences,
  isGenericCollectionKeyword,
  normalizeCollectionKeywords,
} from './keywords';

describe('collection keywords helpers', () => {
  it('identifies generic collection keywords', () => {
    expect(isGenericCollectionKeyword('DEMO')).toBe(true);
    expect(isGenericCollectionKeyword('feature')).toBe(true);
    expect(isGenericCollectionKeyword('features')).toBe(true);
    expect(isGenericCollectionKeyword('géoplateforme')).toBe(true);
    expect(isGenericCollectionKeyword('Tutoriel')).toBe(true);
    expect(isGenericCollectionKeyword('WFS')).toBe(true);
    expect(isGenericCollectionKeyword('occupation du sol')).toBe(false);
  });

  it('filters generic keywords, empty values and duplicates', () => {
    expect(filterCollectionKeywords([
      ' features ',
      'WFS',
      'DEMO',
      'Test',
      '',
      'Occupation du sol',
      'occupation du sol',
      'Urbanisme',
    ])).toEqual(['Occupation du sol', 'Urbanisme']);
  });

  it('can normalize keywords without removing generic values', () => {
    expect(normalizeCollectionKeywords([
      ' features ',
      'WFS',
      '',
      'Occupation du sol',
      'occupation du sol',
    ])).toEqual(['features', 'WFS', 'Occupation du sol']);
  });

  it('sorts keyword occurrences by count then keyword', () => {
    expect(getKeywordOccurrences([
      { keywords: ['features', 'Urbanisme', 'WFS'] },
      { keywords: ['urbanisme', 'Occupation du sol'] },
      { keywords: ['Features', 'Occupation du sol'] },
    ])).toEqual([
      { keyword: 'features', count: 2 },
      { keyword: 'Occupation du sol', count: 2 },
      { keyword: 'Urbanisme', count: 2 },
      { keyword: 'WFS', count: 1 },
    ]);
  });

  it('can exclude generic keyword occurrences', () => {
    expect(getKeywordOccurrences([
      { keywords: ['features', 'Urbanisme', 'WFS'] },
      { keywords: ['urbanisme', 'Occupation du sol'] },
    ], { includeGeneric: false })).toEqual([
      { keyword: 'Urbanisme', count: 2 },
      { keyword: 'Occupation du sol', count: 1 },
    ]);
  });
});
