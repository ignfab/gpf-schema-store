import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { getDatasetsConfigPath, loadDatasetsConfig } from '@/config/datasets'
import { dumpDatasets, resolveDatasets, selectCollection } from '@/helpers/datasets'
import { loadCswRecords } from '@/source/csw-store'

describe('config/datasets.yaml', () => {
  const config = loadDatasetsConfig()
  const records = loadCswRecords()

  it('is valid and normalized (sorted, stable key order)', () => {
    expect(config.datasets.length).toBeGreaterThan(0)
    // the file is the output of `npm run update:datasets` (no manual formatting)
    expect(readFileSync(getDatasetsConfigPath(), 'utf-8')).toBe(dumpDatasets(config))
  })

  it('has a record in data/csw for each non-ignored csw dataset', () => {
    const recordIds = records.map((record) => record.fileIdentifier)
    const expectedIds = config.datasets
      .filter((dataset) => dataset.source === 'csw' && !dataset.ignored && !dataset.missing)
      .map((dataset) => dataset.id)
    expect(recordIds).toEqual(expectedIds)
  })

  it('only keeps the records of the non-ignored datasets in data/csw', () => {
    const ignoredIds = new Set(config.datasets.filter((dataset) => dataset.ignored).map((dataset) => dataset.id))
    expect(records.filter((record) => ignoredIds.has(record.fileIdentifier))).toEqual([])
  })

  it('gives links to the manual datasets', () => {
    for (const dataset of config.datasets.filter((candidate) => candidate.source === 'manual')) {
      expect(dataset.links?.length, dataset.id).toBeGreaterThan(0)
    }
  })

  it('selects the main collections', () => {
    const datasets = resolveDatasets(config, records)
    expect(selectCollection('BDTOPO_V3:batiment', datasets).selected).toBe(true)
    expect(selectCollection('BDTOPO_V3:haie', datasets).selected).toBe(true)
    expect(selectCollection('BDTOPO_V3:erp', datasets).selected).toBe(false)
    expect(selectCollection('CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle', datasets).selected).toBe(true)
    expect(selectCollection('wfs_du:zone_urba', datasets).selected).toBe(true)
  })
})
