import { ISearchResult } from '../dto';

/**
 * Calculates the search cursor to be used for paginating search results.
 * It consists of two part and a separator. Both parts represent the last search result returned from the previous search.
 * First part is the score. Second part is the UUID of the entity returned.
 *
 * > IMPORTANT: The _id field for the second part of the cursor may make more sense but Elastic advices against it.
 * `The _id field is restricted from use in aggregations, sorting, and scripting"`
 * For more info visit [_id field](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-id-field.html)
 */
export const calculateSearchCursor = (
  array: Array<ISearchResult>
): string | undefined => {
  const lastElement = array.at(-1);

  if (!lastElement) {
    return undefined;
  }

  return `${lastElement.score}::${lastElement.result.id}`;
};
