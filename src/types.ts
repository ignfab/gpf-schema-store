import { z } from 'zod';

/**
 * The schema of the metadata of a namespace, currently assigned in data/namespace-filters.yaml
 * 
 * Note that no additional properties are allowed in the metadata object (strict).
 */
export const collectionMetadataSchema = z.object({
    ignored: z.boolean().describe("Indicates whether the namespace should be ignored"),
    ignoredReason: z.string().optional().describe("The reason for ignoring the namespace"),
    product: z.string().optional().describe("The product associated with the namespace"),
}).strict();

/**
 * The metadata of a namespace.
 */
export type CollectionMetadata = z.infer<typeof collectionMetadataSchema>;


/**
 * The schema of a rule in data/namespace-filters.yaml,
 * which contains patterns to match against the namespace 
 * and the metadata to assign if the patterns match.
 */
export const namespaceFilterRuleSchema = z.object({
    id: z.string().min(1).describe("The unique identifier of the rule"),
    patterns: z.array(z.string()).describe("The patterns to match against the namespace"),
    metadata: collectionMetadataSchema.describe("The metadata to assign if the namespace matches the patterns"),
});

/**
 * A rule to assign a metadata to a namespace based on pattern matching as
 * defined in data/namespace-filters.yaml.
 */
export type NamespaceFilterRule = z.infer<typeof namespaceFilterRuleSchema>;


/**
 * The schema of the data/namespace-filters.yaml file, which contains rules
 * to assign metadata to namespaces based on pattern matching.
 */
export const namespaceFiltersSchema = z.object({
    rules: z.array(namespaceFilterRuleSchema),
});


/**
 * A property of a collection.
 */
export type CollectionProperty = {
  /**
   * The name of the property.
   */
  name: string;
  /**
   * The type of the property.
   */
  type: string;
  /**
   * The title of the property.
   */
  title?: string;
  /**
   * The description of the property.
   */
  description?: string;
  /**
   * The possible values of the property.
   */
  enum?: string[];
  /**
   * The default CRS of the geometry property (if the property is a geometry).
   */
  defaultCrs?: string;
};


/**
 * The schema of a collection.
 */
export type Collection = {
  /**
   * The id of the collection (ex : "BDTOPO_V3:batiment").
   */
  id: string;
  /**
   * The namespace of the collection (ex : "BDTOPO_V3").
   * 
   * @warning this is not standard in OGC API - Features 
   * (might be renamed to "serie" if they deal with grouping collections by a common theme and version)
   */
  namespace: string;
  /**
   * The name of the collection (ex : "batiment").
   */
  name: string;
  /**
   * The title of the collection.
   */
  title: string;
  /**
   * The description of the collection.
   */
  description: string;
  /**
   * The properties of the collection.
   */
  properties: CollectionProperty[];
};

/**
 * A brief version of the collection provided by GetCapabilities
 * without the properties (given by DescribeFeatureType)
 */
export type CollectionBrief = Omit<Collection, 'properties'>;
