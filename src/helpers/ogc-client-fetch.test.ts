import { afterEach, describe, expect, it, vi } from 'vitest'

const setGlobalDispatcherMock = vi.hoisted(() => vi.fn())
const getProxyForUrlMock = vi.hoisted(() => vi.fn())

vi.mock('undici', () => {
  class ProxyAgent {
    proxyUrl: string

    constructor(proxyUrl: string) {
      this.proxyUrl = proxyUrl
    }
  }

  return { ProxyAgent, setGlobalDispatcher: setGlobalDispatcherMock }
})

vi.mock('proxy-from-env', () => ({
  getProxyForUrl: getProxyForUrlMock,
}))

async function loadHelper() {
  vi.resetModules()
  setGlobalDispatcherMock.mockClear()
  getProxyForUrlMock.mockClear()

  return import('./ogc-client-fetch')
}

describe('configureOgcClientFetchOptionsForUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not configure dispatcher when no proxy is returned', async () => {
    getProxyForUrlMock.mockReturnValue(undefined)

    const { configureOgcClientFetchOptionsForUrl } = await loadHelper()

    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')

    expect(setGlobalDispatcherMock).not.toHaveBeenCalled()
  })

  it('configures a dispatcher when a proxy URL is returned', async () => {
    getProxyForUrlMock.mockReturnValue('http://proxy.ign.fr:3128')

    const { configureOgcClientFetchOptionsForUrl } = await loadHelper()

    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')

    expect(setGlobalDispatcherMock).toHaveBeenCalledTimes(1)
    expect(setGlobalDispatcherMock.mock.calls[0]?.[0]).toMatchObject({
      proxyUrl: 'http://proxy.ign.fr:3128',
    })
  })

  it('does not recreate the dispatcher when the same proxy is already configured', async () => {
    getProxyForUrlMock.mockReturnValue('http://proxy.ign.fr:3128')

    const { configureOgcClientFetchOptionsForUrl } = await loadHelper()

    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')
    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')

    expect(setGlobalDispatcherMock).toHaveBeenCalledTimes(1)
  })

  it('reconfigures the dispatcher when the proxy URL changes', async () => {
    getProxyForUrlMock.mockReturnValue('http://proxy.ign.fr:3128')

    const { configureOgcClientFetchOptionsForUrl } = await loadHelper()

    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')

    getProxyForUrlMock.mockReturnValue('http://proxy2.ign.fr:3128')
    configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')

    expect(setGlobalDispatcherMock).toHaveBeenCalledTimes(2)
    expect(setGlobalDispatcherMock.mock.calls[0]?.[0]).toMatchObject({
      proxyUrl: 'http://proxy.ign.fr:3128',
    })
    expect(setGlobalDispatcherMock.mock.calls[1]?.[0]).toMatchObject({
      proxyUrl: 'http://proxy2.ign.fr:3128',
    })
  })
})
