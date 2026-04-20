import type {
  MiniSearchCollectionSearchEngine,
  MiniSearchCollectionSearchMatch,
} from '../search/minisearch-engine';

const FIELD_DISPLAY_ORDER = [
  'name',
  'title',
  'description',
  'identifierTokens',
  'namespace',
  'properties',
  'allowedValues',
  'representedFeatures',
  'selectionCriteria',
] as const;

function compareFieldNames(left: string, right: string): number {
  const leftIndex = FIELD_DISPLAY_ORDER.indexOf(left as typeof FIELD_DISPLAY_ORDER[number]);
  const rightIndex = FIELD_DISPLAY_ORDER.indexOf(right as typeof FIELD_DISPLAY_ORDER[number]);
  const safeLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const safeRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
  if (safeLeftIndex !== safeRightIndex) {
    return safeLeftIndex - safeRightIndex;
  }
  return left.localeCompare(right);
}

function sortFields(fields: string[]): string[] {
  return [...fields].sort(compareFieldNames);
}

function formatMatchExplanation(match: MiniSearchCollectionSearchMatch): string[] {
  if (!match.match) {
    return [];
  }

  const orderedTerms = [
    ...(match.queryTerms ?? []),
    ...Object.keys(match.match).filter((term) => !(match.queryTerms ?? []).includes(term)),
  ];

  return orderedTerms
    .filter((term, index, terms) => terms.indexOf(term) === index)
    .filter((term) => term in match.match!)
    .map((term) => `   - ${term} -> ${sortFields(match.match![term]).join(', ')}`);
}

function formatTerms(label: string, terms?: string[]): string | undefined {
  if (!terms || terms.length === 0) {
    return undefined;
  }
  return `   ${label}: ${terms.join(', ')}`;
}

function formatCombineWith(
  combineWith: ReturnType<MiniSearchCollectionSearchEngine['getDefaultSearchOptions']>['combineWith'],
): string {
  return combineWith ?? 'OR (MiniSearch default)';
}

function formatEngineConfig(engine: MiniSearchCollectionSearchEngine): string[] {
  const options = engine.getDefaultSearchOptions();
  const fields = options.fields?.join(', ') ?? 'all indexed fields';
  const combineWith = formatCombineWith(options.combineWith);
  const fuzzy = options.fuzzy ?? 'default';
  const boostEntries = Object.entries(options.boost ?? {})
    .sort(([left], [right]) => compareFieldNames(left, right));
  const boostWidth = Math.max(...boostEntries.map(([field]) => field.length), 0);

  return [
    'Search engine config',
    '--------------------',
    `  fuzzy       ${fuzzy}`,
    `  combineWith ${combineWith}`,
    `  fields      ${fields}`,
    '  boosts:',
    ...boostEntries.map(([field, value]) => `    ${field.padEnd(boostWidth)} ${value}`),
  ];
}

export function renderSearchOutputs(
  engine: MiniSearchCollectionSearchEngine,
  query: string,
  matches: MiniSearchCollectionSearchMatch[],
): string[] {
  const lines = [
    '',
    ...formatEngineConfig(engine),
    '',
    'Search results',
    '--------------',
    `query: ${query}`,
    `results: ${matches.length}`,
  ];

  if (matches.length === 0) {
    return lines;
  }

  lines.push('');

  for (const [index, match] of matches.entries()) {
    if (index > 0) {
      lines.push('');
    }

    lines.push(`${index + 1}. ${match.id}`);

    if (typeof match.score === 'number') {
      lines.push(`   score: ${match.score.toFixed(3)}`);
    }

    const queryTermsLine = formatTerms('query terms', match.queryTerms);
    if (queryTermsLine) {
      lines.push(queryTermsLine);
    }

    const matchedTermsLine = formatTerms('matched terms', match.terms);
    if (matchedTermsLine) {
      lines.push(matchedTermsLine);
    }

    const explanationLines = formatMatchExplanation(match);
    if (explanationLines.length > 0) {
      lines.push('   matched fields:');
      lines.push(...explanationLines);
    }
  }

  return lines;
}
