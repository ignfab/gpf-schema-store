import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SourceCollection } from '../../../src/types';
import {
  parseOverwrite,
  validateOverwriteReferences,
} from '../../../src/overwrite/overwrite';

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

describe('parseOverwrite', () => {
  it('accepts all local BDTOPO overwrite files', () => {
    const files = listJsonFiles('data/overwrites/BDTOPO_V3');

    expect(files).toHaveLength(60);
    for (const file of files) {
      expect(() => parseOverwrite(
        JSON.parse(readFileSync(file, 'utf-8')) as unknown,
        file,
      )).not.toThrow();
    }
  });

  it('rejects legacy root identifiers', () => {
    expect(() => parseOverwrite({
      id: 'NS:feature',
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [],
    })).toThrow(/root field "id"/);
  });

  it('rejects missing mandatory overwrite fields', () => {
    expect(() => parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      properties: [],
    })).toThrow(/x-ign-theme|required/);
  });

  it('rejects oneOf values without const', () => {
    expect(() => parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [
        {
          name: 'status',
          type: 'string',
          title: 'Status',
          description: 'Status description',
          oneOf: [{ title: 'Missing const' }],
        },
      ],
    })).toThrow(/const/);
  });

  it('rejects properties missing required descriptive fields', () => {
    expect(() => parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [
        {
          name: 'status',
          type: 'string',
        },
      ],
    })).toThrow(/title|description/);
  });

  it('rejects duplicate oneOf const values in the same property', () => {
    expect(() => parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [
        {
          name: 'status',
          type: 'string',
          title: 'Status',
          description: 'Status description',
          oneOf: [
            { const: 'A', title: 'A' },
            { const: 'A', title: 'A again' },
          ],
        },
      ],
    })).toThrow(/duplicate oneOf const "A"/);
  });
});

describe('validateOverwriteReferences', () => {
  const collection: SourceCollection = {
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
    const overwrite = parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: ['missing'],
      properties: [{ name: 'id', type: 'string', title: 'ID', description: 'Identifier' }],
    });

    expect(() => validateOverwriteReferences(collection, overwrite)).toThrow(
      /Required property "missing"/,
    );
  });

  it('rejects overwrite properties that are not in the WFS collection', () => {
    const overwrite = parseOverwrite({
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [{ name: 'missing', type: 'string', title: 'Missing', description: 'Missing property' }],
    });

    expect(() => validateOverwriteReferences(collection, overwrite)).toThrow(
      /Property "missing"/,
    );
  });
});
