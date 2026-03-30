import MiniSearch from 'minisearch';
import type { Collection } from '../types';
import type {
  CollectionSearchEngine,
  CollectionSearchMatch,
  CollectionSearchOptions,
} from './types';

export class MiniSearchCollectionSearchEngine implements CollectionSearchEngine {
  private readonly miniSearch: MiniSearch<Collection>;

  constructor(collections: Collection[]) {
    this.miniSearch = new MiniSearch<Collection>({
      idField: 'id',
      fields: [
        'id',
        'namespace',
        'name',
        'title',
        'description',
        'properties',
      ],
      stringifyField: (fieldValue, fieldName) => {
        if (fieldName === 'properties') {
          return JSON.stringify(fieldValue);
        }
        return String(fieldValue);
      },
    });

    this.miniSearch.addAll(collections);
  }

  search(query: string, _options?: CollectionSearchOptions): CollectionSearchMatch[] {
    const results = this.miniSearch.search(query, {
      boost: {
        id: 3.0,
        namespace: 5.0,
        title: 2.0,
        description: 1.5,
        properties: 1.3,
      },
      fuzzy: 0.2,
    });

    const matches = results.map((result) => ({
      id: result.id as string,
      score: result.score,
    }));

    return matches;
  }
}
