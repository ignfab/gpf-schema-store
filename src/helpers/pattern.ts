function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests a value against a pattern where `*` is a wildcard and everything else
 * is matched literally.
 */
export function matchPattern(value: string, pattern: string): boolean {
  const regexPattern = `^${escapeRegExp(pattern).replace(/\\\*/g, '.*')}$`;
  return new RegExp(regexPattern).test(value);
}
