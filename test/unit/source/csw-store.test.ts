import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CswRecord } from '@/source/types'

const dataDir = vi.hoisted(() => ({ path: '' }))

vi.mock('@/config/data-dir', () => ({
  getDataDir: () => dataDir.path,
}))

import { isValidFileIdentifier, loadCswRecords, replaceCswRecords } from '@/source/csw-store'

function buildRecord(fileIdentifier: string): CswRecord {
  return {
    fileIdentifier,
    type: 'series',
    title: `Title of ${fileIdentifier}`,
    keywords: ['keyword'],
    links: [
      {
        type: 'wfs',
        url: 'https://data.geopf.fr/wfs/ows?SERVICE=WFS',
        protocol: 'OGC:WFS',
        name: 'NS:table',
      },
    ],
  }
}

describe('csw-store', () => {
  beforeEach(() => {
    dataDir.path = mkdtempSync(join(tmpdir(), 'gpf-schema-store-csw-'))
  })

  afterEach(() => {
    rmSync(dataDir.path, { recursive: true, force: true })
  })

  it('returns an empty list when data/csw does not exist', () => {
    expect(loadCswRecords()).toEqual([])
  })

  it('writes data/csw/{fileIdentifier}.json and reads the records back', () => {
    const records = [buildRecord('IGNF_BD-TOPO'), buildRecord('1.0')]
    replaceCswRecords(records)

    expect(readdirSync(join(dataDir.path, 'csw')).sort()).toEqual(['1.0.json', 'IGNF_BD-TOPO.json'])
    expect(readFileSync(join(dataDir.path, 'csw', 'IGNF_BD-TOPO.json'), 'utf-8')).toBe(
      `${JSON.stringify(records[0], null, 2)}\n`,
    )
    expect(loadCswRecords()).toEqual([records[1], records[0]])
  })

  it('fully replaces the previous records', () => {
    replaceCswRecords([buildRecord('OLD')])
    replaceCswRecords([buildRecord('NEW')])

    expect(readdirSync(join(dataDir.path, 'csw'))).toEqual(['NEW.json'])
    expect(existsSync(join(dataDir.path, '.csw-previous'))).toBe(false)
  })

  it('rejects invalid file identifiers', () => {
    expect(() => replaceCswRecords([buildRecord('Métropole du Grand Paris - Trame noire')])).toThrow(
      'Invalid fileIdentifier for a file name',
    )
    expect(existsSync(join(dataDir.path, 'csw'))).toBe(false)
  })

  it('rejects duplicate records', () => {
    expect(() => replaceCswRecords([buildRecord('A'), buildRecord('A')])).toThrow('Duplicate CSW record: A')
  })

  it('rejects invalid records', () => {
    const invalid = { ...buildRecord('A'), links: [{ type: 'ftp', url: 'ftp://example.org' }] } as unknown as CswRecord
    expect(() => replaceCswRecords([invalid])).toThrow(/Invalid CSW record A: links\.0\.type/)
  })

  it('validates the records on read', () => {
    mkdirSync(join(dataDir.path, 'csw'))
    writeFileSync(join(dataDir.path, 'csw', 'A.json'), JSON.stringify({ fileIdentifier: 'A' }))
    expect(() => loadCswRecords()).toThrow(/Invalid CSW record .*A\.json/)
  })

  it('rejects a file whose name does not match the fileIdentifier', () => {
    mkdirSync(join(dataDir.path, 'csw'))
    writeFileSync(join(dataDir.path, 'csw', 'A.json'), JSON.stringify(buildRecord('B')))
    expect(() => loadCswRecords()).toThrow('unexpected fileIdentifier B')
  })
})

describe('isValidFileIdentifier', () => {
  it('accepts readable identifiers', () => {
    for (const id of ['IGNF_BD-TOPO', '0', '1.0', 'BDML_DELMAR.xml', '025f828f-e726-437d-b07e-6a1f81c8f0bf']) {
      expect(isValidFileIdentifier(id)).toBe(true)
    }
  })

  it('rejects identifiers that are not usable as file names', () => {
    for (const id of ['', '.', '..', 'a/b', 'Métropole du Grand Paris - Cartes du SCOT', 'a b']) {
      expect(isValidFileIdentifier(id)).toBe(false)
    }
  })
})
