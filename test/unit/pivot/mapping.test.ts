import { describe, expect, it } from 'vitest';
import { isGeometryPropertyType, isValidPropertyType } from '../../../src/pivot/types';

describe('isValidPropertyType', () => {
  it('should return true for "string"', () => {
    expect(isValidPropertyType('string')).to.be.true;
  });

  it('should return true for "float"', () => {
    expect(isValidPropertyType('float')).to.be.true;
  });

  it('should return false for "list"', () => {
    expect(isValidPropertyType('list')).to.be.false;
  });

})

describe('isGeometryPropertyType', () => {

  it('should return false for "string"', () => {
    expect(isGeometryPropertyType('string')).to.be.false;
  });

  it('should return false for "list"', () => {
    expect(isGeometryPropertyType('list')).to.be.false;
  });


  it('should return true for "point"', () => {
    expect(isGeometryPropertyType('point')).to.be.true;
  });

})


