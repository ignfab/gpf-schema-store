import type { Collection, CollectionBrief } from '../types';

const GENERIC_COLLECTION_KEYWORDS = new Set([
  'dataset',
  'demo',
  'feature',
  'features',
  'geoplateforme',
  'important',
  'keywordwfs',
  'produits',
  'qgis',
  'recette',
  'test',
  'tutoriel',
  'vecteur',
  'wfs',
]);

type KeywordSource = Pick<Collection | CollectionBrief, 'keywords'>;

export type KeywordOccurrence = {
  keyword: string;
  count: number;
};

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export function isGenericCollectionKeyword(keyword: string): boolean {
  return GENERIC_COLLECTION_KEYWORDS.has(normalizeKeyword(keyword));
}

function cleanCollectionKeywords(
  keywords: string[] | undefined,
  options: { includeGeneric: boolean },
): string[] | undefined {
  if (!keywords) {
    return undefined;
  }

  const cleanedKeywords: string[] = [];
  const seen = new Set<string>();
  for (const keyword of keywords) {
    const trimmedKeyword = keyword.trim();
    const normalizedKeyword = normalizeKeyword(trimmedKeyword);
    const generic = isGenericCollectionKeyword(trimmedKeyword);
    if (!trimmedKeyword || (!options.includeGeneric && generic) || seen.has(normalizedKeyword)) {
      continue;
    }
    seen.add(normalizedKeyword);
    cleanedKeywords.push(trimmedKeyword);
  }

  return cleanedKeywords.length > 0 ? cleanedKeywords : undefined;
}

export function normalizeCollectionKeywords(keywords: string[] | undefined): string[] | undefined {
  return cleanCollectionKeywords(keywords, { includeGeneric: true });
}

export function filterCollectionKeywords(keywords: string[] | undefined): string[] | undefined {
  return cleanCollectionKeywords(keywords, { includeGeneric: false });
}

export function getKeywordOccurrences(
  collections: KeywordSource[],
  options: { includeGeneric?: boolean } = {},
): KeywordOccurrence[] {
  const includeGeneric = options.includeGeneric ?? true;
  const occurrences = new Map<string, KeywordOccurrence>();

  for (const collection of collections) {
    for (const keyword of collection.keywords ?? []) {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) {
        continue;
      }

      const normalizedKeyword = normalizeKeyword(trimmedKeyword);
      const generic = isGenericCollectionKeyword(trimmedKeyword);
      if (generic && !includeGeneric) {
        continue;
      }

      const occurrence = occurrences.get(normalizedKeyword);
      if (occurrence) {
        occurrence.count += 1;
      } else {
        occurrences.set(normalizedKeyword, {
          keyword: trimmedKeyword,
          count: 1,
        });
      }
    }
  }

  return [...occurrences.values()].sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count;
    }
    return left.keyword.localeCompare(right.keyword);
  });
}
