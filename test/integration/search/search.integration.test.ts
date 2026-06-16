import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import yaml from 'js-yaml'
import { z } from 'zod'

import { getCollectionCatalog } from '../../../src/index'
import { isRunLiveIntegrationTestsEnabled } from '../config'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Schema for validating the structure of use-case.yaml file.
 */
const useCaseSchema = z.object({
  name: z.string().min(1),
  query: z.string().min(1),
  expected: z.array(z.string().min(1)).min(1),
})

const useCasesSchema = z.array(useCaseSchema).min(1)

type UseCase = z.infer<typeof useCaseSchema>

/**
 * Load use cases from use-case.yaml file and validate them against the schema.
 */
function loadUseCases(): UseCase[] {
  const data = yaml.load(readFileSync(join(__dirname, 'use-case.yaml'), 'utf-8'))
  const result = useCasesSchema.safeParse(data)

  if (!result.success) {
    throw new Error(`Invalid search use-case.yaml content: ${result.error.message}`)
  }

  return result.data
}

const runLiveIntegrationTests = isRunLiveIntegrationTestsEnabled()

describe.skipIf(!runLiveIntegrationTests)(
  'CollectionCatalog - searchWithScores with samples from use-case.yaml',
  () => {
    const useCases = loadUseCases()

    const catalog = getCollectionCatalog()

    for (const useCase of useCases) {
      it(useCase.name, () => {
        const results = catalog.searchWithScores(useCase.query, { limit: 5 })
        const ids = results.map((r) => r.id)

        /*
         * ensure that the top N results match the expected IDs 
         * in correct order from the use-case.yaml file
         */
        expect(
          ids.slice(0, useCase.expected.length),
          `expected top ${useCase.expected.length} IDs for query "${useCase.query}"`,
        ).toEqual(useCase.expected)
      })
    }
  },
)
