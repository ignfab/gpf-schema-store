import { type CollectionPropertyType } from "../../pivot/types";
import { UnexpectedTypeError } from '@/errors/types';

/*
 * =============================================================================
 * Mapping from WFS to pivot model
 * =============================================================================
 */


/**
 * TODO : add const for target types (TYPE_STRING,...)
 */
const MAPPING: Record<string, CollectionPropertyType> = {
    'string': 'string',
    'boolean': 'boolean',
    'float': 'float',
    'number': 'float',
    'int': 'integer',
    'point': 'point',
    'linestring': 'linestring',
    'polygon': 'polygon',
    'multilinestring': 'multilinestring',
    'multipolygon': 'multipolygon',
    'multipoint': 'multipoint',
    'geometry': 'geometry',

    /*
     * WARNING : data loss
     * 
     * TODO : date and date-time to CollectionPropertyType
     * 
     * @see https://github.com/ignfab/gpf-schema-store/issues/37
     */
    'date': 'string',
    'date-time': 'string',
};


/**
 * Convert localType from DescribeFeatureType to property type SourceCollection 
 * @param localType from DescribeFeatureType
 */
export function toPropertyType(localType: string): CollectionPropertyType {
    const key = localType.toLowerCase();
    const result = MAPPING[key];
    if (!result) {
        throw new UnexpectedTypeError(localType);
    }
    return result;
}
