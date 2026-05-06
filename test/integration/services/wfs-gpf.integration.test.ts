import { describe, expect, it } from 'vitest'

import { WfsClient } from '../../../src/services/wfs'

/** Désactivé par défaut ; activer avec `RUN_LIVE_INTEGRATION_TESTS=1` (ou `true`, `yes`, `on`). */
function isRunLiveIntegrationTestsEnabled(): boolean {
  const v = process.env.RUN_LIVE_INTEGRATION_TESTS?.trim().toLowerCase()
  if (!v) return false
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

const runLiveIntegrationTests = isRunLiveIntegrationTestsEnabled()

describe.skipIf(!runLiveIntegrationTests)(
  'WfsClient - getCollections with the GPF WFS endpoint',
  () => {
    it('retrieves the collections from the GPF WFS endpoint and returns the expected collections', async () => {
      const wfsClient = new WfsClient('https://data.geopf.fr/wfs')
      const collections = await wfsClient.getCollections()
      expect(collections).toBeDefined()

      const ids = collections.map((c) => c.id)

      expect(ids).toContain('BDTOPO_V3:batiment')
    })
  },
  60_000,
)

describe.skipIf(!runLiveIntegrationTests)(
  'WfsClient - getCollection with the GPF WFS endpoint',
  () => {
    it('retrieves the BDTOPO_V3:batiment from the GPF WFS endpoint and returns the expected collection', async () => {
      const wfsClient = new WfsClient('https://data.geopf.fr/wfs')
      const collection = await wfsClient.getCollection('BDTOPO_V3:batiment')
      expect(collection).toBeDefined()
      expect(collection.id).toBe('BDTOPO_V3:batiment')
      expect(collection.namespace).toBe('BDTOPO_V3')
      expect(collection.name).toBe('batiment')
      expect(collection.title).toBeDefined()
      expect(collection.description).toBeDefined()

      expect(collection.properties).toBeDefined()
      expect(collection.properties.length).toBeGreaterThan(0)
      const propertyNames = collection.properties.map((p) => p.name);
      expect(propertyNames).toContain('cleabs')
      expect(propertyNames).toContain('nature')
      expect(propertyNames).toContain('usage_1')
      expect(propertyNames).toContain('usage_2')
    })
  },
  60_000,
)
