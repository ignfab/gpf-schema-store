import { debuglog } from 'node:util'
const debug = debuglog('gpf-schema-store:configure-fetch')

import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici'

/**
 * Configure fetch by using undici's EnvHttpProxyAgent as the global dispatcher.
 * This allows fetch to respect environment variables for HTTP proxies (e.g. HTTP_PROXY, NO_PROXY).
 * 
 * Note: This module should be imported before any other module that performs fetch operations to ensure the global dispatcher is set.
 * In this project, it is imported in src/services/wfs.ts before any ogc-client operations.
 */
debug('Configured global dispatcher with EnvHttpProxyAgent to respect HTTP_PROXY, HTTPS_PROXY and NO_PROXY environment variables');
setGlobalDispatcher(new EnvHttpProxyAgent())
