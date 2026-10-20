import { z } from 'zod';

import { zCollectionPropertyType } from '@/pivot/types';

/*
 * ============================================================================
 * Internal Source Model
 * ============================================================================
 */
// Raw snapshot loaded from WFS before overwrite-based enrichment.
// `namespace` and `name` are kept for file layout and search, but are not part
// of the public JSON Schema output.

export const zSourceCollectionProperty = z.object({
  name: z.string().min(1),
  type: zCollectionPropertyType,
  defaultCrs: z.string().min(1).optional(),
}).strict();

export type SourceCollectionProperty = z.infer<typeof zSourceCollectionProperty>;


export const zSourceCollection = z.object({
  id: z.string().min(1),
  namespace: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  properties: z.array(zSourceCollectionProperty),
}).strict();

export type SourceCollection = z.infer<typeof zSourceCollection>;


export const zSourceCollectionBrief = zSourceCollection.omit({ properties: true });
/**
 * Informations from GetCapabilities before DescribeFeatureType fills `properties`
 */
export type SourceCollectionBrief = z.infer<typeof zSourceCollectionBrief>;


/*
 * ============================================================================
 * CSW Metadata Records
 * ============================================================================
 */
// Pivot model for the metadata records of https://data.geopf.fr/csw
// stored in data/csw/{fileIdentifier}.json.

export const zCswLinkType = z.enum([
  'wfs',
  'wms',
  'wmts',
  'tms',
  'download',
  'documentation',
  'capabilities',
  'other',
]);

export type CswLinkType = z.infer<typeof zCswLinkType>;


export const zCswLink = z.object({
  type: zCswLinkType,
  url: z.string().min(1),
  protocol: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
}).strict();

export type CswLink = z.infer<typeof zCswLink>;


/**
 * INSPIRE Spatial Scope (code from http://inspire.ec.europa.eu/metadata-codelist/SpatialScope)
 */
export const zCswSpatialScope = z.enum([
  'local',
  'regional',
  'national',
  'european',
  'global',
]);

export type CswSpatialScope = z.infer<typeof zCswSpatialScope>;


export const zCswRecord = z.object({
  fileIdentifier: z.string().min(1),
  type: z.string().min(1).optional(),
  title: z.string(),
  abstract: z.string().optional(),
  keywords: z.array(z.string()),
  spatialScope: zCswSpatialScope.optional(),
  links: z.array(zCswLink),
}).strict();

export type CswRecord = z.infer<typeof zCswRecord>;


export const zCswRecordBrief = z.object({
  fileIdentifier: z.string().min(1),
  title: z.string(),
  type: z.string().min(1).optional(),
}).strict();
/**
 * Informations from the GetRecords listing (Dublin Core brief)
 */
export type CswRecordBrief = z.infer<typeof zCswRecordBrief>;
