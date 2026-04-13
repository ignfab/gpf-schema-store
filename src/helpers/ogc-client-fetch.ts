import { setGlobalDispatcher, ProxyAgent } from 'undici'
import { getProxyForUrl } from 'proxy-from-env'
import { debuglog } from 'node:util'

const debug = debuglog('gpf-schema-store:ogc-client-fetch')

let configuredProxyUrl: string | undefined

/**
 * Configures global undici dispatcher to use a proxy for HTTP requests.
 *
 * This function uses `proxy-from-env` to determine the appropriate proxy
 * configuration based on environment variables:
 * - HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy: Proxy URL
 * - NO_PROXY, no_proxy: Comma-separated list of hosts to exclude from proxying
 *
 * The proxy is configured globally for the entire Node.js process.
 * If the proxy URL is already configured, it will not be reconfigured.
 *
 * @param url - The target URL to configure proxy for.
 *
 * @example
 * ```ts
 * // With HTTPS_PROXY set to http://proxy.example.com:3128
 * configureOgcClientFetchOptionsForUrl('https://data.geopf.fr/wfs')
 * ```
 *
 * @example
 * ```ts
 * // With HTTPS_PROXY and NO_PROXY set
 * process.env.HTTPS_PROXY = 'http://proxy.example.com:3128'
 * process.env.NO_PROXY = 'localhost,.internal.com'
 * configureOgcClientFetchOptionsForUrl('https://api.internal.com/data') // Will bypass proxy
 * ```
 */
export function configureOgcClientFetchOptionsForUrl(url: string): void {
  try {
    const proxyUrl = getProxyForUrl(url)
    if (!proxyUrl) {
      debug(`No proxy configured for ${url}`)
      return
    }

    if (configuredProxyUrl === proxyUrl) {
      debug(`Proxy already configured with ${proxyUrl}`)
      return
    }

    setGlobalDispatcher(new ProxyAgent(proxyUrl))
    configuredProxyUrl = proxyUrl
    debug(`Global proxy configured: ${proxyUrl}`)
  } catch (error) {
    debug(`Failed to configure proxy for ${url}:`, error)
  }
}
