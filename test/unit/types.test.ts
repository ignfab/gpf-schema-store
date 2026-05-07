import { describe, expect, it } from 'vitest';

import { packageMetadataSchema } from '../../src/types';

describe('packageMetadataSchema', () => {
  it('accepts a real package.json shape with additional keys', () => {
    const result = packageMetadataSchema.safeParse({
      name: '@ignfab/gpf-schema-store',
      description: 'Experimental OGC API Features schema store enriched from Geoplateforme WFS.',
      version: '0.1.4',
      type: 'module',
      scripts: {
        test: 'vitest run',
      },
      dependencies: {
        zod: '^4.3.6',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ version: '0.1.4' });
  });

  it('rejects package metadata without a version', () => {
    const result = packageMetadataSchema.safeParse({
      name: '@ignfab/gpf-schema-store',
    });

    expect(result.success).toBe(false);
  });
});
