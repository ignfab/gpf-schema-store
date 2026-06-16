import { debuglog } from 'node:util';
import { z } from 'zod';
import '../../helpers/configure-fetch';
import { formatSchemaIssues } from '../../helpers/zod';

const debug = debuglog('gpf-schema-store:describe-feature-type');

/*
 * =============================================================================
 * Schema & Types
 * =============================================================================
 */

export const describeFeatureTypePropertySchema = z.object({
    name: z.string(),
    maxOccurs: z.number().int(),
    minOccurs: z.number().int(),
    nillable: z.boolean(),
    type: z.string(),
    localType: z.string(),
});

export const describeFeatureTypeFeatureTypeSchema = z.object({
    typeName: z.string(),
    properties: z.array(describeFeatureTypePropertySchema),
});

export type WfsFeatureType = z.infer<typeof describeFeatureTypeFeatureTypeSchema>;


export const describeFeatureTypeResultSchema = z.object({
    elementFormDefault: z.string(),
    targetNamespace: z.string(),
    targetPrefix: z.string(),
    featureTypes: z.array(describeFeatureTypeFeatureTypeSchema),
});

export type DescribeFeatureTypeResult = z.infer<typeof describeFeatureTypeResultSchema>;

/*
 * =============================================================================
 * Function
 * =============================================================================
 */

/**
 * Performs a DescribeFeatureType request and returns the JSON response
 * 
 * Example : https://data.geopf.fr/wfs?request=DescribeFeatureType&service=WFS&outputFormat=application/json&typename=ADMINEXPRESS-COG.2017:departement
 * 
 * @param wfsUrl the URL of the WFS (example : https://data.geopf.fr/wfs)
 * @param typename the typename (example : ADMINEXPRESS-COG.2017:departement)
 */
export async function describeFeatureType(wfsUrl: string, typename: string): Promise<WfsFeatureType> {
    const url = new URL(wfsUrl);
    url.searchParams.set('request', 'DescribeFeatureType');
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('outputFormat', 'application/json');
    url.searchParams.set('typename', typename);

    debug(`DescribeFeatureType ${url.toString()}`);
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`DescribeFeatureType failed for "${typename}": ${response.status} ${response.statusText}`);
    }

    const raw: unknown = await response.json();
    const result = describeFeatureTypeResultSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(`Invalid DescribeFeatureType response for "${typename}": ${formatSchemaIssues(result.error)}`);
    }
    return result.data.featureTypes[0];
}

