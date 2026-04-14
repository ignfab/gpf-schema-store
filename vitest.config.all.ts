import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'

import viteConfig from './vite.config'

/** Même suite que `npm run test`, avec les tests d'intégration HTTP (GPF) activés. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      env: {
        RUN_LIVE_INTEGRATION_TESTS: '1',
      },
    },
  }),
)
