import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchRequestItem,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { groupBy } from 'lodash';
import { SearchFilterInput } from '../dto/inputs';
import { SearchCategory } from '../search.category';
import { parseSearchCursor } from '../util';
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
  options: {
    filters?: SearchFilterInput[];
    /** Multiplier for the size argument as an attempt to ensure the requested size after authorization */
    sizeMultiplier?: number;
    defaults: {
      size: number;
    };
  }
): MsearchRequestItem[] => {
  const { filters, defaults, sizeMultiplier = 2 } = options;
  // grouping by category will highlight the search requests
  const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
    SearchCategory,
    SearchIndex[]
  >;
  // build a head and body for each category
  return Object.keys(indexByCategory).flatMap(category => {
    const indices = indexByCategory[category as SearchCategory].map(
      index => index.name
    );

    const { cursor, size } =
      filters?.find(filter => filter.category === category) ?? {};

    // build the search after argument for paginating the search results
    const search_after = calculateSearchAfter(cursor);
    const resultCount = Math.round((size ?? defaults.size) * sizeMultiplier);

    return [
      { index: indices } as MsearchMultisearchHeader,
      {
        query: searchQuery,
        // return only a small subset of fields to conserve data
        fields: ['id', 'type'],
        // do not include the source in the result
        _source: false,
        // Ask ES which text matched, so `ISearchResult.terms` can report why a
        // document surfaced (server#3702). `*` + the default
        // `require_field_match: true` highlights exactly the fields the query
        // matched, whatever each index's text fields are named. Highlighting
        // needs a retrievable copy of the field — `_source` or a stored field;
        // office-document `content` is `_source`-excluded but mapped
        // `store: true` (reporting-orchestration template) exactly so body
        // matches can still be reported here.
        highlight: {
          fields: { '*': {} },
          // terms are extracted from fragments, not shown as excerpts — keep
          // fragments small and few to bound query-time analysis cost
          fragment_size: 100,
          number_of_fragments: 3,
          // truncate analysis instead of failing the search when a stored
          // field exceeds the index's `highlight.max_analyzed_offset` (1M)
          max_analyzed_offset: 999_999,
        },
        // max amount of results
        size: resultCount,
        // sort by these fields
        sort: { _score: 'desc', id: 'desc' },
        // provide the values of the fields used for sorting from your last search results
        // to form another page of results
        // skip if it's a new search
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
