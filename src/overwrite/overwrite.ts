import { formatSchemaIssues } from '../helpers/zod';
import {
  collectionOverwriteSchema,
  type CollectionOverwrite,
  type SourceCollection,
} from '../types';

/*
 * =============================================================================
 * Validation Helpers
 * =============================================================================
 */

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

/*
 * =============================================================================
 * Public Validation API
 * =============================================================================
 */

export function parseOverwrite(raw: unknown, context = '<unknown>'): CollectionOverwrite {
  validateNoLegacyRootIdentifiers(raw, context);

  const result = collectionOverwriteSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid overwrite ${context}: ${formatSchemaIssues(result.error)}`);
  }

  validateOneOfDuplicates(result.data, context);
  return result.data;
}

export function validateOverwriteReferences(
  collection: SourceCollection,
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
