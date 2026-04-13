import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setGlobalDispatcherMock = vi.hoisted(() => vi.fn())

vi.mock('undici', () => {
  class EnvHttpProxyAgent {}

  return {
    EnvHttpProxyAgent,
    setGlobalDispatcher: setGlobalDispatcherMock,
  }
})

describe('configure-fetch', () => {
  beforeEach(() => {
    vi.resetModules()
    setGlobalDispatcherMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls setGlobalDispatcher with EnvHttpProxyAgent on import', async () => {
    await import('./configure-fetch')

    expect(setGlobalDispatcherMock).toHaveBeenCalledTimes(1)
    const agent = setGlobalDispatcherMock.mock.calls[0]?.[0]
    expect(agent?.constructor.name).toBe('EnvHttpProxyAgent')
  })
})


