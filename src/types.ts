/**
 * The metadata of a namespace.
 */
export type CollectionMetadata = {
    ignored: boolean;
    ignoredReason?: string;
    product?: string;
    // version?: string;    
}

/**
 * A rule to assign a metadata to a namespace based on pattern matching as
 * defined in data/namespace-filters.yaml.
 */
export interface NamespaceFilterRule {
    // the id of the rule (ex : "ignore_bdto_v3")
    id: string;
    // the patterns to match against the namespace
    patterns: string[];
    // the metadata to assign if the namespace matches the patterns
    metadata: CollectionMetadata;
}


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
