import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retry } from './retry'

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('succeeds on first attempt without waiting', async () => {
    const operation = vi.fn().mockResolvedValue('ok')

    await expect(retry('operation', operation)).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('retries with exponential backoff and jitter then succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockResolvedValueOnce('ok')
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const promise = retry('operation', operation)
    const assertion = expect(promise).resolves.toBe('ok')
    await vi.runAllTimersAsync()

    await assertion
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('throws after 3 failed attempts', async () => {
    const finalError = new Error('fatal')
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(finalError)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const promise = retry('operation', operation)
    const assertion = expect(promise).rejects.toThrow('fatal')
    await vi.runAllTimersAsync()

    await assertion
    expect(operation).toHaveBeenCalledTimes(3)
  })
})
