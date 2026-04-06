import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Collection } from '../types';

const fsMocks = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('node:fs', () => fsMocks);

describe('writeRenderedCatalog', () => {
  const collections: Collection[] = [
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

  it('writes merged collections to {outputDir}/{namespace}/{name}.json', async () => {
    const { writeRenderedCatalog } = await import('./render-catalog');

    const outputDir = writeRenderedCatalog(collections, './tmp/catalog');

    expect(outputDir).toMatch(/[\\/]tmp[\\/]catalog$/);
    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true });
    expect(fsMocks.mkdirSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]catalog[\\/]NS$/),
      { recursive: true },
    );
    expect(fsMocks.writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]tmp[\\/]catalog[\\/]NS[\\/]feature\.json$/),
      expect.stringContaining('"id": "NS:feature"'),
    );
  });

  it('cleans the output directory when requested', async () => {
    const { writeRenderedCatalog } = await import('./render-catalog');

    const outputDir = writeRenderedCatalog(collections, './tmp/catalog', { clean: true });

    expect(fsMocks.rmSync).toHaveBeenCalledWith(outputDir, {
      recursive: true,
      force: true,
    });
  });
});
