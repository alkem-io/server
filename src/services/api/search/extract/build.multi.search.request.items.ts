import { groupBy } from 'lodash';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchRequestItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { parseSearchCursor } from '../util';
import { SearchCategory } from '../search.category';
import { SearchIndex } from './search.index';

/**
 * The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
 * A search request item for a multi search consists of a header and body.
 * Header object - Parameters used to limit or change the search.
 * Body object - Contains parameters for the search request:
 */
export const buildMultiSearchRequestItems = (
  indicesToSearchOn: SearchIndex[],
  searchQuery: QueryDslQueryContainer,
  // skip: number,
  size: number,
  cursor?: string
): MsearchRequestItem[] => {
  // grouping by category will highlight the search requests
  const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
    SearchCategory,
    SearchIndex[]
  >;
  // build the search after argument for paginating the search results
  const search_after = calculateSearchAfter(cursor);
  // build a head and body for each category
  return Object.keys(indexByCategory).flatMap(category => {
    const indices = indexByCategory[category as SearchCategory].map(
      index => index.name
    );

    return [
      { index: indices } as MsearchMultisearchHeader,
      {
        query: searchQuery,
        // return only a small subset of fields to conserve data
        fields: ['id', 'type'],
        // do not include the source in the result
        _source: false,
        // max amount of results
        size,
        // pagination
        sort: { _score: 'desc', id: 'desc' },
        search_after,
      } as MsearchMultisearchBody,
    ];
  });
};

const calculateSearchAfter = (cursor: string | undefined) => {
  if (!cursor) {
    return undefined;
  }

  const { score, id } = parseSearchCursor(cursor);
  return [score, id];
};
