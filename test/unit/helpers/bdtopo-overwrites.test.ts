import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDataDir(): string {
  let dir = __dirname;
  while (true) {
    const candidate = join(dir, 'data');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(`Could not resolve data directory (started from ${__dirname})`);
}

const DATA_DIR = resolveDataDir();
const BDTOPO_OVERWRITES_DIR = join(DATA_DIR, 'overwrites', 'BDTOPO_V3');

const ROOT_KEYS = new Set([
  'title',
  'x-ign-theme',
  'description',
  'x-ign-selectionCriteria',
  'x-ign-representedFeatures',
  'required',
  'properties',
]);

const PROPERTY_KEYS = new Set([
  'name',
  'type',
  'title',
  'description',
  'oneOf',
]);

const ONE_OF_KEYS = new Set([
  'const',
  'title',
  'description',
  'x-ign-representedFeatures',
]);

type RawOverwrite = {
  [key: string]: unknown;
  title: unknown;
  'x-ign-theme': unknown;
  description: unknown;
  required: unknown;
  properties: unknown;
};

function loadBdtopoOverwriteFiles(): { filename: string; data: RawOverwrite }[] {
  if (!existsSync(BDTOPO_OVERWRITES_DIR)) {
    throw new Error(`BDTOPO overwrites directory not found: ${BDTOPO_OVERWRITES_DIR}`);
  }

  return readdirSync(BDTOPO_OVERWRITES_DIR)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => ({
      filename,
      data: JSON.parse(readFileSync(join(BDTOPO_OVERWRITES_DIR, filename), 'utf-8')) as RawOverwrite,
    }));
}

describe('BDTOPO overwrite structural validation', () => {
  const overwriteFiles = loadBdtopoOverwriteFiles();

  it('finds at least one overwrite file', () => {
    expect(overwriteFiles.length).toBeGreaterThan(0);
  });

  for (const { filename, data } of overwriteFiles) {
    describe(`overwrites/BDTOPO_V3/${filename}`, () => {
      it('uses only the current root keys', () => {
        expect(Object.keys(data).every((key) => ROOT_KEYS.has(key))).toBe(true);
        expect('id' in data).toBe(false);
        expect('namespace' in data).toBe(false);
        expect('name' in data).toBe(false);
      });

      it('includes the mandatory root fields', () => {
        expect(typeof data.title).toBe('string');
        expect(typeof data['x-ign-theme']).toBe('string');
        expect(typeof data.description).toBe('string');
        expect(Array.isArray(data.required)).toBe(true);
        expect(Array.isArray(data.properties)).toBe(true);
      });

      it('uses only the current property keys', () => {
        const properties = data.properties as Array<Record<string, unknown>>;
        for (const property of properties) {
          expect(Object.keys(property).every((key) => PROPERTY_KEYS.has(key))).toBe(true);
          expect('enum' in property).toBe(false);
          expect(typeof property.name).toBe('string');
          expect(typeof property.type).toBe('string');
          expect(typeof property.title).toBe('string');
          expect(typeof property.description).toBe('string');
        }
      });

      it('uses only the current oneOf keys', () => {
        const properties = data.properties as Array<Record<string, unknown>>;
        for (const property of properties) {
          if (!Array.isArray(property.oneOf)) {
            continue;
          }
          for (const value of property.oneOf as Array<Record<string, unknown>>) {
            expect(Object.keys(value).every((key) => ONE_OF_KEYS.has(key))).toBe(true);
            expect(typeof value.const).toBe('string');
            expect(typeof value.title).toBe('string');
            if (value.description !== undefined) {
              expect(typeof value.description).toBe('string');
            }
            if (value['x-ign-representedFeatures'] !== undefined) {
              expect(Array.isArray(value['x-ign-representedFeatures'])).toBe(true);
            }
          }
        }
      });
    });
  }
});
