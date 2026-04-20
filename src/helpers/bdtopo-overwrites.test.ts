import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the data directory the same way storage.ts does:
// from src/helpers, go up to src, then up to project root, then down to data.
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

type AvailableWhen = {
  property: string;
  equalsAny: string[];
};

type AllowedValue = {
  value: string;
  description?: string;
  representedFeatures?: string[];
  availableWhen?: AvailableWhen;
};

type OverwriteProperty = {
  name: string;
  type?: string;
  allowedValues?: AllowedValue[];
  nullable?: boolean;
  [key: string]: unknown;
};

type OverwriteCollection = {
  id: string;
  namespace: string;
  name: string;
  title?: string;
  description?: string;
  selectionCriteria?: string;
  representedFeatures?: string[];
  properties: OverwriteProperty[];
};

function loadBdtopoOverwriteFiles(): { filename: string; data: OverwriteCollection }[] {
  if (!existsSync(BDTOPO_OVERWRITES_DIR)) {
    throw new Error(`BDTOPO overwrites directory not found: ${BDTOPO_OVERWRITES_DIR}`);
  }

  const files = readdirSync(BDTOPO_OVERWRITES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  return files.map((filename) => {
    const raw = readFileSync(join(BDTOPO_OVERWRITES_DIR, filename), 'utf-8');
    const data = JSON.parse(raw) as OverwriteCollection;
    return { filename, data };
  });
}

describe('BDTOPO overwrite structural validation', () => {
  const overwriteFiles = loadBdtopoOverwriteFiles();

  it('finds at least one overwrite file', () => {
    expect(overwriteFiles.length).toBeGreaterThan(0);
  });

  for (const { filename, data } of overwriteFiles) {
    describe(`overwrites/BDTOPO_V3/${filename}`, () => {
      it('parses as valid JSON', () => {
        // Already parsed by loadBdtopoOverwriteFiles; just confirm it succeeded.
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      });

      it('does not contain any enum field on properties', () => {
        const propertiesWithEnum = data.properties.filter((p) => 'enum' in p);
        expect(
          propertiesWithEnum,
          `Properties with 'enum' field: ${propertiesWithEnum.map((p) => p.name).join(', ')}`,
        ).toEqual([]);
      });

      it('has no enum field at collection level', () => {
        expect('enum' in data).toBe(false);
      });

      it('every allowedValues entry has at least a value', () => {
        for (const prop of data.properties) {
          if (!prop.allowedValues) continue;
          for (let i = 0; i < prop.allowedValues.length; i++) {
            const av = prop.allowedValues[i];
            expect(
              typeof av.value === 'string' && av.value.length > 0,
              `Property "${prop.name}" allowedValues[${i}] missing 'value'`,
            ).toBe(true);
          }
        }
      });

      it('nullable is a boolean when present', () => {
        for (const prop of data.properties) {
          if (prop.nullable === undefined) continue;
          expect(
            typeof prop.nullable === 'boolean',
            `${filename}: Property "${prop.name}" nullable is not a boolean`,
          ).toBe(true);
        }
      });

      it('representedFeatures on allowedValues are arrays of strings when present', () => {
        for (const prop of data.properties) {
          if (!prop.allowedValues) continue;
          for (let i = 0; i < prop.allowedValues.length; i++) {
            const av = prop.allowedValues[i];
            if (av.representedFeatures === undefined) continue;
            expect(
              Array.isArray(av.representedFeatures),
              `Property "${prop.name}" allowedValues[${i}].representedFeatures is not an array`,
            ).toBe(true);
            for (const feat of av.representedFeatures) {
              expect(
                typeof feat === 'string',
                `Property "${prop.name}" allowedValues[${i}].representedFeatures contains non-string: ${feat}`,
              ).toBe(true);
            }
          }
        }
      });

      it('selectionCriteria is a string when present', () => {
        if (data.selectionCriteria === undefined) return;
        expect(typeof data.selectionCriteria).toBe('string');
      });

      it('representedFeatures at collection level is an array of strings when present', () => {
        if (data.representedFeatures === undefined) return;
        expect(Array.isArray(data.representedFeatures)).toBe(true);
        for (const feat of data.representedFeatures) {
          expect(typeof feat === 'string').toBe(true);
        }
      });

      it('availableWhen on allowedValues has property (string) and equalsAny (string[]) when present', () => {
        for (const prop of data.properties) {
          if (!prop.allowedValues) continue;
          for (let i = 0; i < prop.allowedValues.length; i++) {
            const av = prop.allowedValues[i];
            if (av.availableWhen === undefined) continue;
            expect(
              typeof av.availableWhen.property === 'string' && av.availableWhen.property.length > 0,
              `Property "${prop.name}" allowedValues[${i}].availableWhen.property is missing or empty`,
            ).toBe(true);
            expect(
              Array.isArray(av.availableWhen.equalsAny) && av.availableWhen.equalsAny.length > 0,
              `Property "${prop.name}" allowedValues[${i}].availableWhen.equalsAny is missing or empty`,
            ).toBe(true);
            for (const val of av.availableWhen.equalsAny) {
              expect(
                typeof val === 'string',
                `Property "${prop.name}" allowedValues[${i}].availableWhen.equalsAny contains non-string: ${val}`,
              ).toBe(true);
            }
          }
        }
      });
    });
  }
});
