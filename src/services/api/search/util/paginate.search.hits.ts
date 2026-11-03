import { ISearchResult } from '../dto/results';
import { tryParseSearchCursor } from './try.parse.search.cursor';

/**
 * Cuts one page out of a complete, ranked result set, using the same keyset
 * cursor as the Elasticsearch searches (see `calculateSearchCursor`): the page
 * starts at the first hit ranked after the cursor, in score desc / id desc
 * order. The cursor's own hit does not have to be in the set anymore.
 * @throws BaseExceptionInternal on an invalid cursor
 */
export const paginateSearchHits = (
  rankedHits: ISearchResult[],
  cursor: string | undefined,
  size: number
): { page: ISearchResult[]; hasMore: boolean } => {
  let start = 0;
  if (cursor) {
    const { score, id } = tryParseSearchCursor(cursor);
    start = rankedHits.findIndex(
      hit => hit.score < score || (hit.score === score && hit.result.id < id)
    );
    if (start === -1) {
      start = rankedHits.length;
    }
  }

  return {
    page: rankedHits.slice(start, start + size),
    hasMore: start + size < rankedHits.length,
  };
};
