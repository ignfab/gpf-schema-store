import { describe, expect, it } from 'vitest'
import { matchPattern } from '@/helpers/pattern'

describe('matchPattern', () => {
  it('matches exact patterns', () => {
    expect(matchPattern('AOC-VITICOLES', 'AOC-VITICOLES')).toBe(true)
    expect(matchPattern('AOC-VITICOLES-2', 'AOC-VITICOLES')).toBe(false)
  })

  it('supports `*` as a wildcard', () => {
    expect(matchPattern('ORTHOIMAGERY.ORTHOPHOTOS', 'ORTHOIMAGERY.*')).toBe(true)
    expect(matchPattern('dataset_test', '*_test')).toBe(true)
    expect(matchPattern('alpha_middle_beta', '*middle*')).toBe(true)
    expect(matchPattern('BDTOPO_V3_DIFF:batiment', 'BDTOPO_V3_DIFF:*')).toBe(true)
    expect(matchPattern('BDTOPO_V3:batiment', 'BDTOPO_V3_DIFF:*')).toBe(false)
  })

  it('treats the other regex characters literally', () => {
    expect(matchPattern('ORTHOIMAGERYXfoo', 'ORTHOIMAGERY.*')).toBe(false)
    expect(matchPattern('ADMINEXPRESS-COG-CARTO-PE.LATEST:commune', 'ADMINEXPRESS-COG-CARTO.*')).toBe(false)
    expect(matchPattern('ADMINEXPRESS-COG-CARTO.LATEST:commune', 'ADMINEXPRESS-COG-CARTO.*')).toBe(true)
  })
})
