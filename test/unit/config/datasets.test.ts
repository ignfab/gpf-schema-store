import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rootDir = vi.hoisted(() => ({ path: '' }))

vi.mock('@/config/data-dir', () => ({
  getDataDir: () => join(rootDir.path, 'data'),
}))

import { getDatasetsConfigPath, loadDatasetsConfig, writeDatasetsConfig } from '@/config/datasets'

describe('datasets configuration storage', () => {
  beforeEach(() => {
    rootDir.path = mkdtempSync(join(tmpdir(), 'gpf-schema-store-config-'))
  })

  afterEach(() => {
    rmSync(rootDir.path, { recursive: true, force: true })
  })

  it('locates config/datasets.yaml next to the data directory', () => {
    expect(getDatasetsConfigPath()).toBe(join(rootDir.path, 'config', 'datasets.yaml'))
  })

  it('fails when the file does not exist unless allowMissing is set', () => {
    expect(() => loadDatasetsConfig()).toThrow('does not exist')
    expect(loadDatasetsConfig({ allowMissing: true })).toEqual({ datasets: [] })
  })

  it('writes and reads the configuration', () => {
    const config = {
      datasets: [{ id: 'A', source: 'csw' as const, title: 'A', ignored: true, ignoredReason: 'Reason' }],
    }
    writeDatasetsConfig(config)

    expect(existsSync(getDatasetsConfigPath())).toBe(true)
    expect(readFileSync(getDatasetsConfigPath(), 'utf-8')).toContain('  - id: A\n')
    expect(loadDatasetsConfig()).toEqual(config)
  })
})
