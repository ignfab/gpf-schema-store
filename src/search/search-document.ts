import type { EnrichedCollection, EnrichedCollectionValue } from '../types';

/*
 * =============================================================================
 * Search document projection
 * =============================================================================
 *
 * Search does not index the storage model or the public catalog schema
 * directly. It indexes a dedicated projection built from the enriched
 * collection model, with one field per search signal.
 */

export type SearchDocument = {
  id: string;
  namespace: string;
  name: string;
  identifierTokens: string;
  title: string;
  description: string;
  propertyNames: string;
  propertyTitles: string;
  propertyDescriptions: string;
  oneOfConsts: string;
  oneOfDescriptions: string;
  representedFeatures: string;
  selectionCriteria: string;
};

function joinTerms(values: Array<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}

function joinUniqueTerms(values: Array<string | undefined>): string {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].join(' ');
}

function expandIdentifier(value: string): string {
  return value.replace(/[_:./-]+/g, ' ');
}

function getOneOfValues(collection: EnrichedCollection): EnrichedCollectionValue[] {
  return collection.properties.flatMap((property) => property.oneOf ?? []);
}

export function buildSearchDocument(collection: EnrichedCollection): SearchDocument {
  const oneOfValues = getOneOfValues(collection);
  const collectionRepresentedFeatures = collection['x-ign-representedFeatures'] ?? [];
  const oneOfRepresentedFeatures = oneOfValues.flatMap(
    (value) => value['x-ign-representedFeatures'] ?? [],
  );

  return {
    id: collection.id,
    namespace: collection.namespace,
    name: collection.name,
    identifierTokens: joinUniqueTerms([
      expandIdentifier(collection.id),
      expandIdentifier(collection.namespace),
      expandIdentifier(collection.name),
    ]),
    title: collection.title,
    description: collection.description,
    propertyNames: joinTerms(collection.properties.map((property) => property.name)),
    propertyTitles: joinTerms(collection.properties.map((property) => property.title)),
    propertyDescriptions: joinTerms(collection.properties.map((property) => property.description)),
    oneOfConsts: joinTerms(oneOfValues.map((value) => value.const)),
    oneOfDescriptions: joinTerms(oneOfValues.map((value) => value.description)),
    representedFeatures: joinUniqueTerms([
      ...collectionRepresentedFeatures,
      ...oneOfRepresentedFeatures,
    ]),
    selectionCriteria: collection['x-ign-selectionCriteria'] ?? '',
  };
}

export function buildSearchDocuments(collections: EnrichedCollection[]): SearchDocument[] {
  return collections.map((collection) => buildSearchDocument(collection));
}
