import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnrichedCollection } from '../../../src/types';

const fsMocks = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:fs', () => fsMocks);

describe('writeRenderedCatalog', () => {
  const collections: EnrichedCollection[] = [
    {
      id: 'NS:feature',
      namespace: 'NS',
      name: 'feature',
      title: 'Feature',
      description: 'Feature description',
      properties: [{ name: 'id', type: 'string' }],
    },
  ];

  beforeEach(() => {
    fsMocks.mkdirSync.mockReset();
    fsMocks.rmSync.mockReset();
    fsMocks.writeFileSync.mockReset();
  });

  it('writes collection schemas to {outputDir}/{namespace}/{name}.json', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    const outputDir = writeRenderedCatalog(collections, './tmp/catalog');

    expect(outputDir).toMatch(/[\\/]tmp[\\/]catalog$/);
    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true });
    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]catalog[\\/]NS$/),
      { recursive: true },
    );
    expect(fsMocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]catalog[\\/]NS[\\/]feature\.json$/),
      expect.stringContaining('"$schema": "https://json-schema.org/draft/2020-12/schema"'),
    );
    expect(fsMocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]catalog[\\/]NS[\\/]feature\.json$/),
      expect.stringContaining('"x-collection-id": "NS:feature"'),
    );
  });

  it('cleans the output directory when requested', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    const outputDir = writeRenderedCatalog(collections, './tmp/catalog', { clean: true });

    expect(fsMocks.rmSync).toHaveBeenCalledWith(outputDir, {
      recursive: true,
      force: true,
    });
  });

  it('refuses to clean the project root', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    expect(() => writeRenderedCatalog(collections, '.', { clean: true })).toThrow(
      /project root/,
    );
    expect(fsMocks.rmSync).not.toHaveBeenCalled();
  });

  it('refuses to clean outside the current project', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    expect(() => writeRenderedCatalog(collections, '../catalog', { clean: true })).toThrow(
      /outside the current project/,
    );
    expect(fsMocks.rmSync).not.toHaveBeenCalled();
  });

  it('allows cleaning the catalog output directory under data/catalog', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    const outputDir = writeRenderedCatalog(collections, 'data/catalog', { clean: true });

    expect(outputDir).toMatch(/[\\/]data[\\/]catalog$/);
    expect(fsMocks.rmSync).toHaveBeenCalledWith(outputDir, {
      recursive: true,
      force: true,
    });
  });

  it('refuses to clean protected project directories outside the catalog output', async () => {
    const { writeRenderedCatalog } = await import('../../../src/cli/render-catalog');

    expect(() => writeRenderedCatalog(collections, 'data/wfs', { clean: true })).toThrow(
      /protected project directory/,
    );
    expect(fsMocks.rmSync).not.toHaveBeenCalled();
  });
});
