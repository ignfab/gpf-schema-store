import { chmodSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

/** Rollup ne pose pas le bit exécutable : requis pour les binaires npm (shebang). */
function chmodCliOutput(fileName: string): Plugin {
  return {
    name: 'chmod-cli-output',
    writeBundle(outputOptions, bundle) {
      const dir = outputOptions.dir
      if (!dir || !(fileName in bundle)) return
      chmodSync(join(dir, fileName), 0o755)
    },
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    ssr: resolve(root, 'src/cli.ts'),
    target: 'node20',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      plugins: [chmodCliOutput('cli.js')],
      output: {
        entryFileNames: 'cli.js',
        banner: '#!/usr/bin/env node',
      },
    },
  },
})
