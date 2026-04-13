import { describe, expect, it } from "vitest"
import { WfsClient } from "./wfs"

describe('WfsClient - getCollections with the GPF WFS endpoint', () => {
  it('retrieves the collections from the GPF WFS endpoint and returns the expected collections', async () => {
    const wfsClient = new WfsClient('https://data.geopf.fr/wfs')
    const collections = await wfsClient.getCollections()
    expect(collections).toBeDefined()

    const ids = collections.map((c) => c.id)

    expect(ids).toContain('BDTOPO_V3:batiment')
  })
}, 60_000)

describe('WfsClient - getCollection with the GPF WFS endpoint', () => {
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
}, 60_000)
