import { debuglog } from 'node:util';

import { retry } from '@/helpers/retry';
import { parseGetRecordsResponse, parseIsoRecords } from './csw/parser';
import type { CswRecord, CswRecordBrief } from './types';

const debug = debuglog('gpf-schema-store:csw');

/*
 * =============================================================================
 * CSW Request Settings
 * =============================================================================
 */

const ISO_19139_OUTPUT_SCHEMA = 'http://www.isotc211.org/2005/gmd';
const DEFAULT_PAGE_SIZE = 50;

export type CswClientOptions = {
  /**
   * Number of records per GetRecords page.
   */
  pageSize?: number;
  /**
   * fetch implementation (allows mocking in tests).
   */
  fetch?: typeof fetch;
};

/*
 * =============================================================================
 * CSW Client
 * =============================================================================
 */

export class CswClient {
  private readonly cswUrl: string;
  private readonly pageSize: number;
  private readonly fetchFn: typeof fetch;

  constructor(cswUrl: string, options: CswClientOptions = {}) {
    this.cswUrl = cswUrl;
    this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    this.fetchFn = options.fetch ?? fetch;
  }

  private buildUrl(params: Record<string, string>): string {
    const url = new URL(this.cswUrl);
    url.searchParams.set('service', 'CSW');
    url.searchParams.set('version', '2.0.2');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async fetchText(operationName: string, url: string): Promise<string> {
    return retry(operationName, async () => {
      debug(`GET ${url}`);
      const response = await this.fetchFn(url);
      if (!response.ok) {
        throw new Error(`${operationName} failed: HTTP ${response.status} for ${url}`);
      }
      return response.text();
    });
  }

  /**
   * Lists all the records (fileIdentifier, title, type) with a paginated GetRecords.
   *
   * Records are sorted by identifier : without sorting, the order is not stable
   * between pages and some records may be skipped.
   */
  async listRecords(): Promise<CswRecordBrief[]> {
    const records: CswRecordBrief[] = [];
    let startPosition = 1;
    let numberOfRecordsMatched = 0;

    while (startPosition > 0) {
      const url = this.buildUrl({
        request: 'GetRecords',
        typeNames: 'csw:Record',
        resultType: 'results',
        elementSetName: 'brief',
        sortBy: 'Identifier:A',
        startPosition: String(startPosition),
        maxRecords: String(this.pageSize),
      });
      const page = parseGetRecordsResponse(await this.fetchText('csw.getRecords', url));
      numberOfRecordsMatched = page.numberOfRecordsMatched;
      records.push(...page.records);

      if (page.nextRecord !== 0 && page.nextRecord <= startPosition) {
        throw new Error(`Invalid CSW pagination: nextRecord=${page.nextRecord} after startPosition=${startPosition}`);
      }
      startPosition = page.nextRecord > numberOfRecordsMatched ? 0 : page.nextRecord;
    }

    // A partial list would wrongly flag records as missing.
    if (records.length < numberOfRecordsMatched) {
      throw new Error(
        `Incomplete CSW listing: ${records.length} records retrieved, ${numberOfRecordsMatched} expected`,
      );
    }

    return records;
  }

  /**
   * Retrieves a record in ISO 19139 with GetRecordById.
   */
  async getRecord(fileIdentifier: string): Promise<CswRecord> {
    const url = this.buildUrl({
      request: 'GetRecordById',
      id: fileIdentifier,
      elementSetName: 'full',
      outputSchema: ISO_19139_OUTPUT_SCHEMA,
    });
    const records = parseIsoRecords(await this.fetchText('csw.getRecordById', url));
    const record = records.find((candidate) => candidate.fileIdentifier === fileIdentifier);
    if (!record) {
      throw new Error(`CSW record not found: ${fileIdentifier}`);
    }
    return record;
  }
}
