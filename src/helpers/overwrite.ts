import { z } from 'zod';
import type { Collection, CollectionOverwrite } from '../types';

const representedFeaturesSchema = z.array(z.string().min(1));

const oneOfValueSchema = z.object({
  const: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  'x-ign-representedFeatures': representedFeaturesSchema.optional(),
}).strict();

const propertyOverwriteSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  oneOf: z.array(oneOfValueSchema).optional(),
  'x-ign-representedFeatures': representedFeaturesSchema.optional(),
}).strict();

const collectionOverwriteSchema = z.object({
  title: z.string(),
  description: z.string(),
  'x-ign-theme': z.string().optional(),
  'x-ign-selectionCriteria': z.string().optional(),
  'x-ign-representedFeatures': representedFeaturesSchema.optional(),
  required: z.array(z.string().min(1)).optional(),
  properties: z.array(propertyOverwriteSchema),
}).strict();

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

function getObjectKeys(value: unknown): Set<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Set();
  }
  return new Set(Object.keys(value));
}

function validateNoLegacyRootIdentifiers(raw: unknown, context: string): void {
  const keys = getObjectKeys(raw);
  for (const legacyKey of ['id', 'namespace', 'name']) {
    if (keys.has(legacyKey)) {
      throw new Error(
        `Invalid overwrite ${context}: root field "${legacyKey}" is no longer supported`,
      );
    }
  }
}

function validateOneOfDuplicates(overwrite: CollectionOverwrite, context: string): void {
  const errors: string[] = [];

  for (const property of overwrite.properties) {
    if (!property.oneOf) {
      continue;
    }

    const seen = new Set<string>();
    for (const value of property.oneOf) {
      if (seen.has(value.const)) {
        errors.push(`Property "${property.name}" has duplicate oneOf const "${value.const}"`);
      }
      seen.add(value.const);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid overwrite ${context}: ${errors.join('; ')}`);
  }
}

export function parseCollectionOverwrite(raw: unknown, context = '<unknown>'): CollectionOverwrite {
  validateNoLegacyRootIdentifiers(raw, context);

  const result = collectionOverwriteSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid overwrite ${context}: ${formatZodIssues(result.error)}`);
  }

  validateOneOfDuplicates(result.data, context);
  return result.data;
}

export function validateCollectionOverwriteReferences(
  collection: Collection,
  overwrite: CollectionOverwrite,
  context = collection.id,
): void {
  const errors: string[] = [];
  const propertyNames = new Set(collection.properties.map((property) => property.name));

  for (const property of overwrite.properties) {
    if (!propertyNames.has(property.name)) {
      errors.push(`Property "${property.name}" is not present in WFS collection`);
    }
  }

  for (const propertyName of overwrite.required ?? []) {
    if (!propertyNames.has(propertyName)) {
      errors.push(`Required property "${propertyName}" is not present in WFS collection`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid overwrite ${context}: ${errors.join('; ')}`);
  }
}
