import { ISearchResult } from '../dto/results';
import { SearchResultType } from '../search.result.type';
import { calculateSearchCursor } from './calculate.search.cursor';
import { paginateSearchHits } from './paginate.search.hits';

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const hit = (score: number, n: number): ISearchResult => ({
  id: `hit-${n}`,
  score,
  type: SearchResultType.SPACE,
  terms: [],
  result: { id: uuid(n) },
});

// ranked score desc, id desc — as Elasticsearch returns them
const ranked = [hit(9, 5), hit(7, 4), hit(7, 3), hit(5, 2), hit(3, 1)];

describe('paginateSearchHits', () => {
  it('returns the first page without a cursor', () => {
    const { page, hasMore } = paginateSearchHits(ranked, undefined, 2);
    expect(page).toEqual([ranked[0], ranked[1]]);
    expect(hasMore).toBe(true);
  });

  it('continues after the cursor, breaking score ties by id', () => {
    const cursor = calculateSearchCursor([ranked[1]]);
    const { page, hasMore } = paginateSearchHits(ranked, cursor, 2);
    expect(page).toEqual([ranked[2], ranked[3]]);
    expect(hasMore).toBe(true);
  });

  it('reports no more results on the last page', () => {
    const cursor = calculateSearchCursor([ranked[2]]);
    const { page, hasMore } = paginateSearchHits(ranked, cursor, 2);
    expect(page).toEqual([ranked[3], ranked[4]]);
    expect(hasMore).toBe(false);
  });

  it('continues after a cursor whose hit is no longer in the set', () => {
    const withoutCursorHit = ranked.filter(h => h !== ranked[1]);
    const cursor = calculateSearchCursor([ranked[1]]);
    const { page } = paginateSearchHits(withoutCursorHit, cursor, 2);
    expect(page).toEqual([ranked[2], ranked[3]]);
  });

  it('returns an empty page past the end', () => {
    const cursor = calculateSearchCursor([ranked[4]]);
    expect(paginateSearchHits(ranked, cursor, 2)).toEqual({
      page: [],
      hasMore: false,
    });
  });

  it('throws on an invalid cursor', () => {
    expect(() => paginateSearchHits(ranked, 'not-a-cursor', 2)).toThrow();
  });
});
