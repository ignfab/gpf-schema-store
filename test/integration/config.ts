/** Désactivé par défaut ; activer avec `RUN_LIVE_INTEGRATION_TESTS=1` (ou `true`, `yes`, `on`). */
export function isRunLiveIntegrationTestsEnabled(): boolean {
  const v = process.env.RUN_LIVE_INTEGRATION_TESTS?.trim().toLowerCase()
  if (!v) return false
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}
