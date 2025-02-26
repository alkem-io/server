import { groupBy } from 'lodash';
import { SearchCategory } from '../search.category';
import { SearchIndex } from './search.index';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchRequestItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
 * A search request item for a multi search consists of a header and body.
 * Header object - Parameters used to limit or change the search.
 * Body object - Contains parameters for the search request:
 */
export const buildMultiSearchRequestItems = (
  indicesToSearchOn: SearchIndex[],
  searchQuery: QueryDslQueryContainer,
  from: number,
  size: number
): MsearchRequestItem[] => {
  // grouping by category will highlight the search requests
  const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
    SearchCategory,
    SearchIndex[]
  >;

  return Object.keys(indexByCategory).flatMap(category => {
    const indices = indexByCategory[category as SearchCategory].map(
      index => index.name
    );

    return [
      { index: indices } as MsearchMultisearchHeader,
      {
        query: searchQuery,
        // return only a small subset of fields to conserve data
        fields: ['id', 'type', 'category::asd'],
        // do not include the source in the result
        _source: false,
        // offset, starting from 0
        from,
        // max amount of results
        size,
      } as MsearchMultisearchBody,
    ];
  });
};
