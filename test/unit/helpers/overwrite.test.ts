import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SourceCollection } from '@/source/types';
import {
  parseOverwrite,
  validateOverwriteReferences,
} from '@/overwrite/overwrite';

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

  it('accepts all local overwrite files with traceability fields', () => {
    for (const file of listJsonFiles('data/overwrites')) {
      const overwrite = parseOverwrite(
        JSON.parse(readFileSync(file, 'utf-8')) as unknown,
        file,
      );
      expect(overwrite['x-ign-sources']?.length).toBeGreaterThan(0);
    }
  });

  it('accepts optional x-ign-sources and x-ign-generated', () => {
    const base = {
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [],
    };

    expect(parseOverwrite(base)['x-ign-generated']).toBeUndefined();
    expect(parseOverwrite({
      ...base,
      'x-ign-sources': [
        { title: 'Doc', path: 'https://example.org/doc.pdf', version: '2023' },
        { title: 'Other doc', path: 'https://example.org/other.pdf' },
      ],
      'x-ign-generated': {
        by: 'ai',
        tool: 'Claude Code (claude-opus-5-5)',
        date: '2026-10-21',
        reviewed: { by: 'mborne', date: '2026-10-21' },
      },
    })['x-ign-generated']?.by).toBe('ai');
    // AI generation details are optional
    expect(() => parseOverwrite({
      ...base,
      'x-ign-generated': { by: 'ai' },
    })).not.toThrow();
  });

  it('rejects invalid x-ign-sources and x-ign-generated', () => {
    const base = {
      title: 'Feature',
      description: 'Feature description',
      'x-ign-theme': 'Theme',
      required: [],
      properties: [],
    };

    expect(() => parseOverwrite({
      ...base,
      'x-ign-sources': [{ title: 'Missing path' }],
    })).toThrow(/path/);
    expect(() => parseOverwrite({
      ...base,
      'x-ign-generated': { by: 'robot' },
    })).toThrow(/by/);
    expect(() => parseOverwrite({
      ...base,
      'x-ign-generated': { by: 'ai', date: '21/10/2026' },
    })).toThrow(/YYYY-MM-DD/);
    expect(() => parseOverwrite({
      ...base,
      'x-ign-generated': { by: 'ai', reviewed: { date: '2026-10-21' } },
    })).toThrow(/by/);
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
