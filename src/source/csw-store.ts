import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

import { zCswRecord, type CswRecord } from './types';
import { formatSchemaIssues } from '@/helpers/zod';
import { getDataDir } from '@/config/data-dir';
import { replaceDirectory } from '@/helpers/replace-directory';

/*
 * =============================================================================
 * CSW record storage
 * =============================================================================
 *
 * This module owns the local copy of the metadata records under
 * data/csw/{fileIdentifier}.json.
 */

/**
 * fileIdentifier values allowed as file names (no sanitization, so that file
 * names stay readable in diffs).
 */
const FILE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidFileIdentifier(fileIdentifier: string): boolean {
  return FILE_IDENTIFIER_PATTERN.test(fileIdentifier)
    && fileIdentifier !== '.'
    && fileIdentifier !== '..';
}

function parseCswRecord(raw: unknown, context: string): CswRecord {
  const result = zCswRecord.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid CSW record ${context}: ${formatSchemaIssues(result.error)}`);
  }
  return result.data;
}

export function loadCswRecords(): CswRecord[] {
  const cswRoot = join(getDataDir(), 'csw');
  if (!existsSync(cswRoot)) {
    return [];
  }

  const files = readdirSync(cswRoot)
    .filter((file) => file.endsWith('.json'))
    .sort();

  return files.map((file) => {
    const filePath = join(cswRoot, file);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
    const record = parseCswRecord(raw, filePath);
    if (`${record.fileIdentifier}.json` !== file) {
      throw new Error(`Invalid CSW record ${filePath}: unexpected fileIdentifier ${record.fileIdentifier}`);
    }
    return record;
  });
}

/**
 * Replaces data/csw with the given records.
 */
export function replaceCswRecords(records: CswRecord[]): void {
  const fileIdentifiers = new Set<string>();
  for (const record of records) {
    parseCswRecord(record, record.fileIdentifier);
    if (!isValidFileIdentifier(record.fileIdentifier)) {
      throw new Error(`Invalid fileIdentifier for a file name: ${record.fileIdentifier}`);
    }
    if (fileIdentifiers.has(record.fileIdentifier)) {
      throw new Error(`Duplicate CSW record: ${record.fileIdentifier}`);
    }
    fileIdentifiers.add(record.fileIdentifier);
  }

  replaceDirectory(getDataDir(), 'csw', (cswRoot) => {
    for (const record of records) {
      writeFileSync(
        join(cswRoot, `${record.fileIdentifier}.json`),
        `${JSON.stringify(record, null, 2)}\n`,
      );
    }
  });
}
