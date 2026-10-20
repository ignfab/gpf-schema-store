import { describe, expect, it } from 'vitest'

import type { DatasetsConfig } from '@/config/types'
import {
  dumpDatasets,
  getTypenameNamespace,
  NEW_DATASET_REASON,
  parseDatasets,
  resolveDatasets,
  selectCollection,
  updateDatasets,
} from '@/helpers/datasets'
import type { CswRecord, CswRecordBrief } from '@/source/types'

/*
 * =============================================================================
 * Fixtures
 * =============================================================================
 */

const CONFIG: DatasetsConfig = {
  datasets: [
    {
      id: 'IGNF_BD-TOPO',
      source: 'csw',
      title: 'BD TOPO®',
      product: 'BDTOPO_V3',
      excludes: [
        { type: 'wfs', pattern: 'BDTOPO_V3_DIFF:*', reason: 'Historical data' },
        { type: 'wfs', pattern: 'BDTOPO_V3:erp', reason: 'See #56' },
      ],
    },
    {
      id: 'GPU',
      source: 'manual',
      title: "Géoportail de l'Urbanisme",
      product: 'GPU',
      links: [
        { type: 'wfs', name: 'wfs_du:*' },
        { type: 'wfs', name: 'wfs_scot:*' },
      ],
    },
    {
      id: 'IGNF_SCAN-25',
      source: 'csw',
      title: 'SCAN 25®',
      ignored: true,
      ignoredReason: 'Raster dataset',
    },
  ],
}

function brief(fileIdentifier: string, title = `Title of ${fileIdentifier}`): CswRecordBrief {
  return { fileIdentifier, title, type: 'series' }
}

function record(fileIdentifier: string, wfsNames: string[]): CswRecord {
  return {
    fileIdentifier,
    type: 'series',
    title: fileIdentifier,
    keywords: [],
    links: [
      ...wfsNames.map((name) => ({
        type: 'wfs' as const,
        url: 'https://data.geopf.fr/wfs/ows?SERVICE=WFS',
        protocol: 'OGC:WFS',
        name,
      })),
      { type: 'wmts' as const, url: 'https://data.geopf.fr/wmts', name: 'OTHER:layer' },
    ],
  }
}

/*
 * =============================================================================
 * Read and write
 * =============================================================================
 */

describe('parseDatasets', () => {
  it('parses a valid configuration', () => {
    expect(parseDatasets(dumpDatasets(CONFIG)).datasets.map((dataset) => dataset.id)).toEqual([
      'GPU',
      'IGNF_BD-TOPO',
      'IGNF_SCAN-25',
    ])
  })

  it('rejects duplicate ids', () => {
    const yaml = `
datasets:
  - id: A
    source: csw
    title: A
  - id: A
    source: manual
    title: A
`
    expect(() => parseDatasets(yaml)).toThrow("datasets.1.id: Duplicate dataset id 'A'")
  })

  it('rejects unknown fields', () => {
    const yaml = `
datasets:
  - id: A
    source: csw
    title: A
    ignore: true
`
    expect(() => parseDatasets(yaml)).toThrow('Invalid datasets.yaml content:')
  })

  it('requires a title', () => {
    const yaml = `
datasets:
  - id: A
    source: csw
`
    expect(() => parseDatasets(yaml)).toThrow('datasets.0.title')
  })

  it('rejects an unknown source', () => {
    const yaml = `
datasets:
  - id: A
    source: other
    title: A
`
    expect(() => parseDatasets(yaml)).toThrow('datasets.0.source')
  })

  it('only supports wfs links and excludes for now', () => {
    const links = `
datasets:
  - id: A
    source: manual
    title: A
    links:
      - type: wmts
        name: layer
`
    expect(() => parseDatasets(links)).toThrow('datasets.0.links.0.type')

    const excludes = `
datasets:
  - id: A
    source: csw
    title: A
    excludes:
      - type: wmts
        pattern: layer
`
    expect(() => parseDatasets(excludes)).toThrow('datasets.0.excludes.0.type')
  })
})

describe('dumpDatasets', () => {
  it('writes the datasets sorted by id with a stable key order', () => {
    const yaml = dumpDatasets({
      datasets: [
        { title: 'B', source: 'csw', id: 'b', ignoredReason: 'Reason', ignored: true },
        { id: 'B', source: 'csw', title: 'B upper', ignored: false, missing: false },
        { id: '1.0', source: 'csw', title: 'Numeric id' },
      ],
    })

    expect(yaml).toMatch(/^# Datasets of the Géoplateforme/)
    expect(yaml.slice(yaml.indexOf('datasets:'))).toBe(`datasets:

  - id: '1.0'
    source: csw
    title: Numeric id

  - id: B
    source: csw
    title: B upper

  - id: b
    source: csw
    title: B
    ignored: true
    ignoredReason: Reason
`)
  })

  it('is stable (dump/parse/dump)', () => {
    const yaml = dumpDatasets(CONFIG)
    expect(dumpDatasets(parseDatasets(yaml))).toBe(yaml)
  })

  it('rejects an invalid configuration', () => {
    expect(() => dumpDatasets({ datasets: [{ id: 'A', source: 'csw', title: '' }] })).toThrow()
  })
})

/*
 * =============================================================================
 * Merge
 * =============================================================================
 */

describe('updateDatasets', () => {
  const records = [
    brief('IGNF_BD-TOPO', 'BD TOPO® (updated)'),
    brief('IGNF_SCAN-25', 'SCAN 25®'),
  ]

  it('adds new records as ignored, preserving the existing decisions', () => {
    const { config, report } = updateDatasets(CONFIG, [...records, brief('IGNF_NEW', 'New dataset')])

    expect(config.datasets.find((dataset) => dataset.id === 'IGNF_NEW')).toEqual({
      id: 'IGNF_NEW',
      source: 'csw',
      title: 'New dataset',
      ignored: true,
      ignoredReason: NEW_DATASET_REASON,
    })
    expect(config.datasets.find((dataset) => dataset.id === 'IGNF_BD-TOPO')).toEqual({
      ...CONFIG.datasets[0],
      title: 'BD TOPO® (updated)',
    })
    expect(config.datasets.find((dataset) => dataset.id === 'IGNF_SCAN-25')).toEqual(CONFIG.datasets[2])
    expect(report.added).toEqual(['IGNF_NEW'])
    expect(report.updated).toEqual(['IGNF_BD-TOPO'])
  })

  it('never modifies manual entries', () => {
    const { config } = updateDatasets(CONFIG, records)
    expect(config.datasets.find((dataset) => dataset.id === 'GPU')).toEqual(CONFIG.datasets[1])
  })

  it('flags disappeared records with missing and removes the flag when they come back', () => {
    const first = updateDatasets(CONFIG, [brief('IGNF_SCAN-25', 'SCAN 25®')])
    const topo = first.config.datasets.find((dataset) => dataset.id === 'IGNF_BD-TOPO')
    expect(topo).toEqual({ ...CONFIG.datasets[0], missing: true })
    expect(first.report.missing).toEqual(['IGNF_BD-TOPO'])

    const second = updateDatasets(first.config, [brief('IGNF_SCAN-25', 'SCAN 25®')])
    expect(second.report.missing).toEqual([])

    const third = updateDatasets(second.config, [brief('IGNF_BD-TOPO', 'BD TOPO®'), brief('IGNF_SCAN-25', 'SCAN 25®')])
    expect(third.config.datasets.find((dataset) => dataset.id === 'IGNF_BD-TOPO')).toEqual(CONFIG.datasets[0])
    expect(third.report.restored).toEqual(['IGNF_BD-TOPO'])
  })

  it('sorts the datasets by id with a locale-independent order', () => {
    const { config } = updateDatasets({ datasets: [] }, [brief('b'), brief('B'), brief('a'), brief('A'), brief('_')])
    expect(config.datasets.map((dataset) => dataset.id)).toEqual(['A', 'B', '_', 'a', 'b'])
  })

  it('is idempotent', () => {
    const first = updateDatasets(CONFIG, [...records, brief('IGNF_NEW')])
    const second = updateDatasets(first.config, [...records, brief('IGNF_NEW')])
    expect(dumpDatasets(second.config)).toBe(dumpDatasets(first.config))
    expect(second.report).toEqual({
      added: [],
      updated: [],
      missing: [],
      restored: [],
      skipped: [],
      conflicts: [],
      manualWithoutLinks: [],
    })
  })

  it('skips records whose fileIdentifier is not usable as a file name', () => {
    const { config, report } = updateDatasets({ datasets: [] }, [brief('Métropole du Grand Paris - Trame noire'), brief('A')])
    expect(config.datasets.map((dataset) => dataset.id)).toEqual(['A'])
    expect(report.skipped).toEqual(['Métropole du Grand Paris - Trame noire'])
  })

  it('uses the fileIdentifier as title when the record has no title', () => {
    const { config } = updateDatasets({ datasets: [] }, [brief('A', '  ')])
    expect(config.datasets[0].title).toBe('A')
  })

  it('reports manual entries without links and conflicts with records', () => {
    const { config, report } = updateDatasets(
      { datasets: [{ id: 'LOCAL', source: 'manual', title: 'Local' }] },
      [brief('LOCAL')],
    )
    expect(config.datasets).toEqual([{ id: 'LOCAL', source: 'manual', title: 'Local' }])
    expect(report.manualWithoutLinks).toEqual(['LOCAL'])
    expect(report.conflicts).toEqual(['LOCAL'])
  })
})

/*
 * =============================================================================
 * Resolve and select
 * =============================================================================
 */

describe('getTypenameNamespace', () => {
  it('returns the namespace of a typename', () => {
    expect(getTypenameNamespace('BDTOPO_V3:haie')).toBe('BDTOPO_V3')
    expect(getTypenameNamespace('wfs_du:*')).toBe('wfs_du')
    expect(getTypenameNamespace('potentiel_agronomique_CCC:potentiel agronomique')).toBe('potentiel_agronomique_CCC')
  })

  it('returns undefined for names that are not typenames', () => {
    expect(getTypenameNamespace('COMMUNE')).toBeUndefined()
    expect(getTypenameNamespace('Graphe de mosaïquage BD ORTHO')).toBeUndefined()
    expect(getTypenameNamespace('a:b:c')).toBeUndefined()
  })
})

describe('resolveDatasets', () => {
  it('merges the record WFS links with the configured links', () => {
    const config: DatasetsConfig = {
      datasets: [
        ...CONFIG.datasets,
        { id: 'FIXED', source: 'csw', title: 'Fixed', links: [{ type: 'wfs', name: 'zaer:*' }] },
      ],
    }
    const resolved = resolveDatasets(config, [
      record('IGNF_BD-TOPO', ['BDTOPO_V3:batiment', 'BDTOPO_V3:batiment']),
      record('FIXED', ['ZAER:zone']),
    ])

    expect(resolved.map((dataset) => [dataset.id, dataset.ignored, dataset.wfsLinks])).toEqual([
      ['IGNF_BD-TOPO', false, ['BDTOPO_V3:batiment']],
      ['GPU', false, ['wfs_du:*', 'wfs_scot:*']],
      ['IGNF_SCAN-25', true, []],
      ['FIXED', false, ['ZAER:zone', 'zaer:*']],
    ])
    expect(resolved[0].record?.fileIdentifier).toBe('IGNF_BD-TOPO')
    expect(resolved[0].product).toBe('BDTOPO_V3')
    expect(resolved[1].record).toBeUndefined()
  })
})

describe('selectCollection', () => {
  const datasets = resolveDatasets(
    {
      datasets: [
        ...CONFIG.datasets,
        { id: 'IGNF_BD-HAIE', source: 'csw', title: 'BD HAIE', product: 'BDTOPO_V3' },
        { id: 'IGNORED', source: 'csw', title: 'Ignored', ignored: true },
      ],
    },
    [
      record('IGNF_BD-TOPO', ['BDTOPO_V3:batiment', 'BDTOPO_V3_DIFF:batiment']),
      record('IGNF_BD-HAIE', ['BDTOPO_V3:haie']),
      record('IGNORED', ['IGNORED_NS:table']),
    ],
  )

  it('selects the collections of the namespaces of the non-ignored datasets', () => {
    expect(selectCollection('BDTOPO_V3:troncon_de_route', datasets)).toEqual({
      selected: true,
      datasets: ['IGNF_BD-TOPO', 'IGNF_BD-HAIE'],
    })
    expect(selectCollection('wfs_du:zone_urba', datasets)).toEqual({ selected: true, datasets: ['GPU'] })
  })

  it('lets the exclusions win over the other candidates (shared namespace)', () => {
    expect(selectCollection('BDTOPO_V3:erp', datasets)).toEqual({
      selected: false,
      datasets: ['IGNF_BD-TOPO', 'IGNF_BD-HAIE'],
      reason: 'Excluded by IGNF_BD-TOPO (BDTOPO_V3:erp): See #56',
    })
    expect(selectCollection('BDTOPO_V3_DIFF:batiment', datasets)).toMatchObject({
      selected: false,
      reason: 'Excluded by IGNF_BD-TOPO (BDTOPO_V3_DIFF:*): Historical data',
    })
  })

  it('ignores the collections without candidate', () => {
    expect(selectCollection('UNKNOWN:table', datasets)).toEqual({
      selected: false,
      datasets: [],
      reason: 'No dataset',
    })
    expect(selectCollection('IGNORED_NS:table', datasets)).toMatchObject({ selected: false, reason: 'No dataset' })
    expect(selectCollection('invalid typename', datasets)).toMatchObject({ selected: false, reason: 'No dataset' })
  })
})
