import { UnexpectedTypeError, type CollectionPropertyType } from "../../types";

/**
 * TODO : add const for target types (TYPE_STRING,...)
 */
const MAPPING: Record<string, CollectionPropertyType> = {
    'string': 'string',
    'boolean': 'boolean',
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
     * WARNING : data loss.
     * 
     * TODO : add date and date-time to CollectionPropertyType 
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
