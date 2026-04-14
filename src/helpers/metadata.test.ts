import { describe, expect, it } from 'vitest';
import { parseFeatureTypeName } from './metadata';

const expectedFormatHint = '(expected : {namespace}:{table})';

describe('parseFeatureTypeName', () => {
  it('splits a typical WFS typename into namespace and local name', () => {
    expect(parseFeatureTypeName('BDTOPO_V3:batiment')).toEqual({
      namespace: 'BDTOPO_V3',
      name: 'batiment',
    });
  });

  it('rejects more than one colon', () => {
    expect(() => parseFeatureTypeName('ns:type:extra')).toThrow(
      `Unexpected format for typename : ns:type:extra ${expectedFormatHint}`,
    );
  });

  it('rejects a single part without colon', () => {
    expect(() => parseFeatureTypeName('unprefixed')).toThrow(
      `Unexpected format for typename : unprefixed ${expectedFormatHint}`,
    );
  });

  it('rejects an empty local name', () => {
    expect(() => parseFeatureTypeName('only:')).toThrow(
      `Unexpected format for typename : only: ${expectedFormatHint}`,
    );
  });

  it('rejects an empty namespace', () => {
    expect(() => parseFeatureTypeName(':table')).toThrow(
      `Unexpected format for typename : :table ${expectedFormatHint}`,
    );
  });
});
