import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Collection } from '../types'
import { merge } from './merge'

const base: Collection = {
  id: 'NS:collection',
  namespace: 'NS',
  name: 'collection',
  title: 'Base title',
  description: 'Base description',
  properties: [{ name: 'geom', type: 'geometry' }],
}

describe('mergeCollectionSchema', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps collection id, namespace and name and and original property names; other fields from overwrite', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Other title',
      description: 'Other description',
      properties: [{ name: 'id', type: 'string' }],
    }

    expect(merge(base, overwrite)).toEqual({
      id: 'NS:collection',
      namespace: 'NS',
      name: 'collection',
      title: 'Other title',
      description: 'Other description',
      properties: [{ name: 'geom', type: 'geometry' }],
    })
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('NS:collection')
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('geom')
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('id')
  })

  it('should ignore and report extra properties in overwrite', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      properties: [{ name: 'id', type: 'string' }, { name: 'extra', type: 'string' }],
    }
    expect(merge(base, overwrite)).toEqual(base)
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('should keep id from original', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      id: 'OTHER:other',
    }
    expect(merge(base, overwrite)).toEqual(base)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('should keep name from original', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      name: 'other',
    }
    expect(merge(base, overwrite)).toEqual(base)
    expect(warnSpy).not.toHaveBeenCalled()
  });
  
  it('should keep namespace from original', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      namespace: 'OTHER',
    }
    expect(merge(base, overwrite)).toEqual(base)
    expect(warnSpy).not.toHaveBeenCalled()
  });

  it('should use title from overwrite', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      title: 'Modified title',
    }
    expect(merge(base, overwrite)).toEqual(overwrite)
    expect(warnSpy).not.toHaveBeenCalled()
  });


  it('should use description from overwrite if overwrite is provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      description: 'Modified description',
    }
    expect(merge(base, overwrite)).toEqual(overwrite)
    expect(warnSpy).not.toHaveBeenCalled()
  });

  it('should use description from original if overwrite is not provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base
    }
    expect(merge(base, overwrite)).toEqual(base)
    expect(warnSpy).not.toHaveBeenCalled()
  });


  it('does not mutate source objects', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overwrite: Collection = {
      ...base,
      title: 'Modified title',
    }
    const baseSnapshot = structuredClone(base)
    const overwriteSnapshot = structuredClone(overwrite)

    merge(base, overwrite)

    expect(base).toEqual(baseSnapshot)
    expect(overwrite).toEqual(overwriteSnapshot)
    expect(warnSpy).not.toHaveBeenCalled()
  })

})
