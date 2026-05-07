import { describe, expect, it } from 'vitest';
import { buildSearchDocument } from '../../../src/search/search-document';

describe('buildSearchDocument', () => {
  it('splits enriched collection signals into dedicated search fields', () => {
    const document = buildSearchDocument({
      id: 'NS:bridge_layer',
      namespace: 'NS',
      name: 'bridge_layer',
      title: 'Bridge layer',
      description: 'Bridge features',
      'x-ign-selectionCriteria': 'Only named bridges',
      'x-ign-representedFeatures': ['Pont routier'],
      properties: [
        {
          name: 'nature',
          type: 'string',
          title: 'Nature',
          description: 'Bridge nature',
          oneOf: [
            {
              const: 'PONT',
              title: 'Pont',
              description: 'Bridge',
              'x-ign-representedFeatures': ['Viaduc'],
            },
          ],
        },
      ],
    });

    expect(document).toMatchObject({
      id: 'NS:bridge_layer',
      namespace: 'NS',
      name: 'bridge_layer',
      title: 'Bridge layer',
      description: 'Bridge features',
      propertyNames: 'nature',
      propertyTitles: 'Nature',
      propertyDescriptions: 'Bridge nature',
      oneOfConsts: 'PONT',
      oneOfDescriptions: 'Bridge',
      selectionCriteria: 'Only named bridges',
    });
    expect(document.identifierTokens).toContain('bridge layer');
    expect(document.representedFeatures).toContain('Pont routier');
    expect(document.representedFeatures).toContain('Viaduc');
  });
});
