/**
 * Test helpers for managing proxy environment variables.
 */

const PROXY_ENV_NAMES = [
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'NO_PROXY',
  'no_proxy',
] as const

let originalProxyEnv: Readonly<Record<(typeof PROXY_ENV_NAMES)[number], string | undefined>>

/**
 * Initialize the proxy environment helper by saving the current environment variables.
 * This should be called once before any tests run.
 */
export function initProxyEnv(): void {
  originalProxyEnv = Object.fromEntries(
    PROXY_ENV_NAMES.map((name) => [name, process.env[name]]),
  ) as Readonly<Record<(typeof PROXY_ENV_NAMES)[number], string | undefined>>
}

/**
 * Clear all proxy environment variables.
 */
export function clearProxyEnv(): void {
  for (const name of PROXY_ENV_NAMES) {
    delete process.env[name]
  }
}

/**
 * Restore the original proxy environment variables.
 */
export function restoreProxyEnv(): void {
  for (const name of PROXY_ENV_NAMES) {
    const value = originalProxyEnv[name]
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }
}

/**
 * Set proxy environment variables for testing.
 */
export function setProxyEnv(env: Partial<Record<(typeof PROXY_ENV_NAMES)[number], string>>): void {
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }
}

/**
 * Run a function with a temporary proxy environment configuration.
 * The original environment is restored after the function completes.
 */
export async function withProxyEnv<T>(
  env: Partial<Record<(typeof PROXY_ENV_NAMES)[number], string>>,
  fn: () => Promise<T>,
): Promise<T> {
  const savedEnv: Record<string, string | undefined> = {}

  // Save current values
  for (const name of Object.keys(env)) {
    savedEnv[name] = process.env[name]
  }

  // Set new values
  setProxyEnv(env)

  try {
    return await fn()
  } finally {
    // Restore saved values
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  }
}
