import { describe, expect, it } from 'vitest'
import { loadNamespaceFilters, findFirstMatchingRule } from './filter'

describe('loadNamespaceFilters', () => {
  it('loads filters from a YAML object with rules', () => {
    const yamlContent = `
rules:
  - id: test_rule
    patterns:
      - test_*
    metadata:
      ignored: true
      ignoredReason: Test data
`

    expect(loadNamespaceFilters(yamlContent)).toEqual([
      {
        id: 'test_rule',
        patterns: ['test_*'],
        metadata: {
          ignored: true,
          ignoredReason: 'Test data',
          product: undefined,
        },
      },
    ])
  })

  it('defaults metadata.ignored to false when metadata is missing', () => {
    const yamlContent = `
rules:
  - id: keep_rule
    patterns:
      - keep.me
`

    expect(loadNamespaceFilters(yamlContent)).toEqual([
      {
        id: 'keep_rule',
        patterns: ['keep.me'],
        metadata: {
          ignored: false,
          ignoredReason: undefined,
          product: undefined,
        },
      },
    ])
  })

  it('skips non-object entries in the YAML array', () => {
    const yamlContent = `
rules:
  - id: valid_rule
    patterns:
      - a*
    metadata:
      ignored: false
  - 123
  - null
  - "hello"
`

    expect(loadNamespaceFilters(yamlContent)).toEqual([
      {
        id: 'valid_rule',
        patterns: ['a*'],
        metadata: {
          ignored: false,
          ignoredReason: undefined,
          product: undefined,
        },
      },
    ])
  })

  it('throws when YAML root is an array', () => {
    const yamlContent = `
- id: rule
  patterns:
    - abc
  metadata:
    ignored: true
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid YAML format: Expected an object with a "rules" key.',
    )
  })
})

describe('findFirstMatchingRule', () => {
  const rules = [
    {
      id: 'exact',
      patterns: ['AOC-VITICOLES'],
      metadata: { ignored: false },
    },
    {
      id: 'wildcards',
      patterns: ['ORTHOIMAGERY.*', '*_test', '*middle*', 'prefix_*'],
      metadata: { ignored: true },
    },
  ]

  it('matches exact patterns', () => {
    expect(findFirstMatchingRule('AOC-VITICOLES', rules)?.id).toBe('exact')
  })

  it('matches wildcard prefix patterns', () => {
    expect(findFirstMatchingRule('ORTHOIMAGERY.ORTHOPHOTOS', rules)?.id).toBe('wildcards')
  })

  it('matches wildcard suffix patterns', () => {
    expect(findFirstMatchingRule('dataset_test', rules)?.id).toBe('wildcards')
  })

  it('matches wildcard contains patterns', () => {
    expect(findFirstMatchingRule('alpha_middle_beta', rules)?.id).toBe('wildcards')
  })

  it('matches wildcard prefix with underscore patterns', () => {
    expect(findFirstMatchingRule('prefix_value', rules)?.id).toBe('wildcards')
  })

  it('returns undefined when no pattern matches', () => {
    expect(findFirstMatchingRule('UNKNOWN_NAMESPACE', rules)).toBeUndefined()
  })

  it('treats non-wildcard regex characters literally', () => {
    expect(findFirstMatchingRule('ORTHOIMAGERYXfoo', rules)).toBeUndefined()
  })
})
