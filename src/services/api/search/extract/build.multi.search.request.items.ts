import { groupBy } from 'lodash';
import { SearchCategory } from '../search.category';
import { SearchIndex } from './search.index';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchRequestItem,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * A search item for a multi search consists of a header and body.
 * Header object - Parameters used to limit or change the search.
 * Body object - Contains parameters for the search request:
 */
export const buildMultiSearchRequestItems = (
  indicesToSearchOn: SearchIndex[]
): MsearchRequestItem[] => {
  // grouping by category will highlight the search requests
  const indexByCategory = groupBy(indicesToSearchOn, 'category') as Record<
    SearchCategory,
    SearchIndex[]
  >;
  return [];
  // return Object.keys(indexByCategory).map(category => {
  //   const indices = indexByCategory[category as SearchCategory].map(
  //     index => index.name
  //   );
  //   return buildMultiSearchRequestItem(indices);
  // });
};

const buildMultiSearchRequestItem = (indices: string[]) => {
  return [{} as MsearchMultisearchHeader, {} as MsearchMultisearchBody];
};
