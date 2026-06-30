import { chmodSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dts from 'unplugin-dts/vite'
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

function cliShebang(fileName: string): Plugin {
  return {
    name: 'cli-shebang',
    renderChunk(code, chunk) {
      if (chunk.fileName !== fileName) return null
      return {
        code: `#!/usr/bin/env node\n${code}`,
        map: null,
      }
    },
  }
}

export default defineConfig({
  plugins: [
    dts({
      // Generate .d.ts from src, rewriting the tsconfig `@/*` aliases (paths)
      // into relative paths, so the library is usable by consumers.
      tsconfigPath: resolve(root, 'tsconfig.json'),
      include: ['src/**/*.ts'],
      entryRoot: resolve(root, 'src'),
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['test/**/*.test.ts'],
      reporter: ['text', 'lcov', 'html'],
    },
    env: {
      // suppress UNDICI-EHPA warnings
      NODE_NO_WARNINGS: '1',
    }
  },
  build: {
    ssr: true,
    target: 'node20',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        cli: resolve(root, 'src/cli.ts'),
        index: resolve(root, 'src/index.ts'),
      },
      plugins: [cliShebang('cli.js'), chmodCliOutput('cli.js')],
      output: {
        entryFileNames: ({ name }) => `${name}.js`,
      },
    },
  },
})
