import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Collection } from '../types';
import {
  parseCollectionOverwrite,
  validateCollectionOverwriteReferences,
} from './overwrite';

function listJsonFiles(root: string): string[] {
  return readdirSync(root)
    .flatMap((entry) => {
      const path = join(root, entry);
      if (statSync(path).isDirectory()) {
        return listJsonFiles(path);
      }
      return path.endsWith('.json') ? [path] : [];
    })
    .sort();
}

describe('parseCollectionOverwrite', () => {
  it('accepts all local BDTOPO overwrite files', () => {
    const files = listJsonFiles('data/overwrites/BDTOPO_V3');

    expect(files).toHaveLength(60);
    for (const file of files) {
      expect(() => parseCollectionOverwrite(
        JSON.parse(readFileSync(file, 'utf-8')) as unknown,
        file,
      )).not.toThrow();
    }
  });

  it('rejects legacy root identifiers', () => {
    expect(() => parseCollectionOverwrite({
      id: 'NS:feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [],
    })).toThrow(/root field "id"/);
  });

  it('rejects oneOf values without const', () => {
    expect(() => parseCollectionOverwrite({
      title: 'Feature',
      description: 'Feature description',
      properties: [
        {
          name: 'status',
          oneOf: [{ title: 'Missing const' }],
        },
      ],
    })).toThrow(/const/);
  });

  it('rejects duplicate oneOf const values in the same property', () => {
    expect(() => parseCollectionOverwrite({
      title: 'Feature',
      description: 'Feature description',
      properties: [
        {
          name: 'status',
          oneOf: [
            { const: 'A', title: 'A' },
            { const: 'A', title: 'A again' },
          ],
        },
      ],
    })).toThrow(/duplicate oneOf const "A"/);
  });
});

describe('validateCollectionOverwriteReferences', () => {
  const collection: Collection = {
    id: 'NS:feature',
    namespace: 'NS',
    name: 'feature',
    title: 'Feature',
    description: 'Feature description',
    properties: [
      { name: 'id', type: 'string' },
      { name: 'status', type: 'string' },
    ],
  };

  it('rejects required properties that are not in the WFS collection', () => {
    const overwrite = parseCollectionOverwrite({
      title: 'Feature',
      description: 'Feature description',
      required: ['missing'],
      properties: [{ name: 'id' }],
    });

    expect(() => validateCollectionOverwriteReferences(collection, overwrite)).toThrow(
      /Required property "missing"/,
    );
  });

  it('rejects overwrite properties that are not in the WFS collection', () => {
    const overwrite = parseCollectionOverwrite({
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'missing' }],
    });

    expect(() => validateCollectionOverwriteReferences(collection, overwrite)).toThrow(
      /Property "missing"/,
    );
  });
});
