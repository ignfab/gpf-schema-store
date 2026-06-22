/*
 * ============================================================================
 * Public Catalog Model from OGC API - Features - Part 5: Schemas (draft)
 * 
 * https://ogcapi.ogc.org/features/
 * 
 * ============================================================================
 */


export type CollectionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema';
  'x-collection-id': string;
  type: 'object';
  title: string;
  'x-ign-theme'?: string;
  description: string;
  'x-ign-selectionCriteria'?: string;
  'x-ign-representedFeatures'?: string[];
  properties: Record<string, CollectionSchemaProperty>;
  required: string[];
};

export type CollectionSchemaProperty = {
  type?: 'string' | 'boolean' | 'integer' | 'number';
  format?: string;
  title?: string;
  description?: string;
  oneOf?: CollectionSchemaValue[];
  'x-ogc-role'?: 'id' | 'primary-geometry';
  'x-ign-defaultCrs'?: string;
};

export type CollectionSchemaValue = {
  const: string;
  title: string;
  description?: string;
  'x-ign-representedFeatures'?: string[];
};
