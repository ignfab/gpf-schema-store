import { describe, expect, it } from 'vitest';
import { isGeometryType, isValidPropertyType } from '@/pivot/helpers';

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

describe('isGeometryType', () => {

  it('should return false for "string"', () => {
    expect(isGeometryType('string')).to.be.false;
  });

  it('should return false for "list"', () => {
    expect(isGeometryType('list')).to.be.false;
  });


  it('should return true for "point"', () => {
    expect(isGeometryType('point')).to.be.true;
  });

})


