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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(retry('operation', operation)).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(1)
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('retries with exponential backoff and jitter then succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockResolvedValueOnce('ok')
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const promise = retry('operation', operation)
    const assertion = expect(promise).resolves.toBe('ok')
    await vi.runAllTimersAsync()

    await assertion
    expect(operation).toHaveBeenCalledTimes(3)
    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('200ms')
    expect(String(warnSpy.mock.calls[1]?.[0])).toContain('400ms')
  })

  it('throws after 3 failed attempts and logs final error once', async () => {
    const finalError = new Error('fatal')
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(finalError)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const promise = retry('operation', operation)
    const assertion = expect(promise).rejects.toThrow('fatal')
    await vi.runAllTimersAsync()

    await assertion
    expect(operation).toHaveBeenCalledTimes(3)
    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('failed after 3 attempts')
  })
})
