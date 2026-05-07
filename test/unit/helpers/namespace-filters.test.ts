import { describe, expect, it } from 'vitest'
import { loadNamespaceFilters, findFirstMatchingRule } from '../../../src/helpers/namespace-filters'

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

  it('throws when rules contains non-object entries', () => {
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

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
    )
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
      'Invalid namespace-filters.yaml content:',
    )
  })

  it('throws when patterns is missing', () => {
    const yamlContent = `
rules:
  - id: bad_rule
    metadata:
      ignored: true
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
    )
  })

  it('throws when id is missing', () => {
    const yamlContent = `
rules:
  - patterns:
      - test_*
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
    )
  })

  it('throws when metadata is not an object', () => {
    const yamlContent = `
rules:
  - id: bad_rule
    patterns:
      - test_*
    metadata: true
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
    )
  })


  it('throws when patterns is not an array', () => {
    const yamlContent = `
rules:
  - id: bad_rule
    patterns: 123
    metadata: true
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
    )
  })



  it('throws when metadata.ignored is not a boolean', () => {
    const yamlContent = `
rules:
  - id: bad_rule
    patterns:
      - test_*
    metadata:
      ignored: "yes"
`

    expect(() => loadNamespaceFilters(yamlContent)).toThrow(
      'Invalid namespace-filters.yaml content:',
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
