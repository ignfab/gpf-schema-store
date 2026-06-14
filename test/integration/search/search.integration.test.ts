import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import yaml from 'js-yaml'

import { getCollectionCatalog } from '../../../src/index'
import { isRunLiveIntegrationTestsEnabled } from '../config'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface UseCase {
    name: string
    query: string
    expected: string[]
}

const runLiveIntegrationTests = isRunLiveIntegrationTestsEnabled();

const useCases = yaml.load(
    readFileSync(join(__dirname, 'use-case.yaml'), 'utf-8'),
) as UseCase[]

const catalog = getCollectionCatalog()

describe.skipIf(!runLiveIntegrationTests)(
    'CollectionCatalog - searchWithScores with samples from use-case.yaml',
    () => {
        for (const useCase of useCases) {
            it(useCase.name, () => {
                const results = catalog.searchWithScores(useCase.query, { limit: 5 })
                const ids = results.map((r) => r.id)

                expect(
                    ids.slice(0, useCase.expected.length),
                    `expected top ${useCase.expected.length} IDs for query "${useCase.query}"`,
                ).toEqual(useCase.expected)
            })
        }
    }
)
