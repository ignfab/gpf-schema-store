import {debuglog} from 'node:util';
const debug = debuglog('gpf-schema-store:retry');

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelayMs(attempt: number): number {
  const exp = BASE_DELAY_MS * (2 ** (attempt - 1));
  return exp + Math.floor(Math.random() * (exp + 1));
}

export async function retry<T>(
  operationName: string,
  operation: (attempt: number) => T | Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        debug(`${operationName} failed after ${MAX_ATTEMPTS} attempts`, error);
        throw error;
      }
      const delayMs = computeDelayMs(attempt);
      debug(
        `${operationName} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delayMs}ms`,
      );
      await wait(delayMs);
    }
  }

  throw lastError;
}
