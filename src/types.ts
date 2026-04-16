import { z } from 'zod';

/**
 * Error thrown when an unexpected or invalid property type is encountered.
 */
export class UnexpectedTypeError extends Error {
  /**
   * @param value the unexpected value
   * @param context optional context about where the error occurred
   */
  constructor(value: unknown, context?: string) {
    const message = context
      ? `Unexpected type: "${value}" ${context}`
      : `Unexpected type: "${value}"`;
    super(message);
    this.name = 'UnexpectedTypeError';
  }
}

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
 * This is the current list of the core types for the properties of a collection.
 *
 * Note that :
 * - The current reference is the list of types provided by ogc-client for WFS properties, which includes both scalar types and geometry types.
 * - It will likely need to be extended in the future to include more specific types (ex : date, datetime, etc.)
 *
 * @see https://github.com/ignfab/gpf-schema-store/issues/25
 */
const PROPERTY_TYPES = [
  'string',
  'boolean',
  'float',
  'integer',
  'point',
  'linestring',
  'polygon',
  'multilinestring',
  'multipolygon',
  'multipoint',
  'geometry', // not in ogc-client (to avoid unknown type for geometry)
] as const;

/**
 * The type of a property in a collection.
 * Includes scalar types and geometry types.
 */
export type CollectionPropertyType = typeof PROPERTY_TYPES[number];

/**
 * The set of valid property type values.
 */
const VALID_PROPERTY_TYPES: Set<string> = new Set(PROPERTY_TYPES);

/**
 * Check if a value is a valid CollectionPropertyType.
 * @param value the value to validate
 * @returns true if valid, false otherwise
 */
export function isValidPropertyType(value: unknown): value is CollectionPropertyType {
  return typeof value === 'string' && VALID_PROPERTY_TYPES.has(value);
}

/**
 * Assert that a value is a valid CollectionPropertyType, throwing UnexpectedTypeError if not.
 * @param value the value to validate
 * @param context optional context about where the error occurred
 * @returns the value if valid
 * @throws UnexpectedTypeError if invalid
 */
export function assertIsValidPropertyType(value: unknown, context?: string): CollectionPropertyType {
  if (!isValidPropertyType(value)) {
    throw new UnexpectedTypeError(value, context);
  }
  return value;
}

/**
 * A conditional constraint that indicates when an allowed value is available.
 * The value is only applicable when the referenced property equals one of the
 * values in `equalsAny`.
 */
export type AvailableWhen = {
  /**
   * The name of the property to check.
   */
  property: string;
  /**
   * The values that the referenced property must match.
   */
  equalsAny: string[];
};

/**
 * An allowed value for a property.
 *
 * Source: overwrite files (data/overwrites). These are propagated to the merged
 * collection via the spread in merge() and indexed for search by stringifyAllowedValues().
 *
 * Search indexing:
 *   - value               → indexed in the "allowedValues" virtual search field
 *   - description          → indexed in the "allowedValues" virtual search field
 *   - representedFeatures  → indexed in the "allowedValues" virtual search field (each entry)
 *   - availableWhen        → NOT indexed (conditional constraint, not searchable content)
 */
export type AllowedValue = {
  /**
   * The value.
   */
  value: string;
  /**
   * The description of the value.
   */
  description?: string;
  /**
   * The features represented by this value.
   */
  representedFeatures?: string[];
  /**
   * A conditional constraint indicating when this value is available.
   * Not indexed for search — this is a structural constraint, not content.
   */
  availableWhen?: AvailableWhen;
};

/**
 * A property of a collection.
 *
 * Field sources after merge:
 *   - name        → always from WFS original (never overwritten)
 *   - type        → always from WFS original (never overwritten)
 *   - title       → from overwrite when present
 *   - description → from overwrite when present
 *   - allowedValues → from overwrite when present; indexed in "allowedValues" search field
 *   - nullable    → from overwrite when present
 *   - defaultCrs  → from WFS original only; properties with defaultCrs bypass overwrite entirely
 */
export type CollectionProperty = {
  /**
   * The name of the property. Always from WFS original.
   */
  name: string;
  /**
   * The type of the property. Always from WFS original.
   */
  type: CollectionPropertyType;
  /**
   * The title of the property. From overwrite when present.
   * Indexed in the "properties" search field.
   */
  title?: string;
  /**
   * The description of the property. From overwrite when present.
   * Indexed in the "properties" search field.
   */
  description?: string;
  /**
   * The allowed values of the property. From overwrite when present.
   * Indexed in the "allowedValues" search field (value, description, representedFeatures).
   */
  allowedValues?: AllowedValue[];
  /**
   * Whether the property is nullable. From overwrite when present.
   * Not indexed for search.
   */
  nullable?: boolean;
  /**
   * The default CRS of the geometry property (if the property is a geometry).
   * From WFS original only. Properties with defaultCrs bypass overwrite entirely.
   */
  defaultCrs?: string;
};


/**
 * The schema of a collection.
 *
 * Field sources after merge:
 *   - id, namespace, name → always from WFS original (never overwritten)
 *   - title, description  → from overwrite when present
 *   - selectionCriteria   → from overwrite when present; indexed in "allowedValues" search field
 *   - representedFeatures → from overwrite when present; indexed in "allowedValues" search field
 *   - properties          → merged individually (see CollectionProperty)
 */
export type Collection = {
  /**
   * The id of the collection (ex : "BDTOPO_V3:batiment"). Always from WFS original.
   */
  id: string;
  /**
   * The namespace of the collection (ex : "BDTOPO_V3"). Always from WFS original.
   *
   * @warning this is not standard in OGC API - Features
   * (might be renamed to "serie" if they deal with grouping collections by a common theme and version)
   */
  namespace: string;
  /**
   * The name of the collection (ex : "batiment"). Always from WFS original.
   */
  name: string;
  /**
   * The title of the collection. From overwrite when present.
   * Indexed in the "title" search field.
   */
  title: string;
  /**
   * The description of the collection. From overwrite when present.
   * Indexed in the "description" search field.
   */
  description: string;
  /**
   * The selection criteria of the collection. From overwrite when present.
   * Indexed in the "allowedValues" virtual search field.
   */
  selectionCriteria?: string;
  /**
   * The features represented by the collection. From overwrite when present.
   * Indexed in the "allowedValues" virtual search field (each entry individually).
   */
  representedFeatures?: string[];
  /**
   * The properties of the collection. Merged individually from WFS + overwrite.
   * See CollectionProperty for per-field source and indexing details.
   */
  properties: CollectionProperty[];
};

/**
 * A property from an overwrite file.
 *
 * Overwrite files may still contain legacy or richer type names. They are
 * enrichment inputs only: the merged collection keeps the WFS property type.
 */
export type CollectionPropertyOverwrite = Omit<CollectionProperty, 'type'> & {
  /**
   * Legacy field ignored by merge. Kept permissive because existing overwrite
   * JSON files can contain values such as "numeric".
   */
  type?: string;
};

/**
 * The schema of a collection overwrite.
 */
export type CollectionOverwrite = Omit<Collection, 'properties'> & {
  /**
   * The properties of the overwrite.
   */
  properties: CollectionPropertyOverwrite[];
};

/**
 * A brief version of the collection provided by GetCapabilities
 * without the properties (given by DescribeFeatureType)
 */
export type CollectionBrief = Omit<Collection, 'properties'>;
