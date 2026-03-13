import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';
import { buildMultiSearchRequestItems } from './build.multi.search.request.items';
import type { SearchIndex } from './search.index';

describe('buildMultiSearchRequestItems', () => {
  const baseQuery = { bool: { must: [{ multi_match: { query: 'test' } }] } };

  it('should build header+body pairs for each category', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
      {
        name: 'test-subspaces',
        type: SearchResultType.SUBSPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 10 },
    });

    // One category (SPACES) -> 1 header + 1 body = 2 items
    expect(result).toHaveLength(2);
    // Header should contain both indices
    expect((result[0] as any).index).toEqual(['test-spaces', 'test-subspaces']);
    // Body should contain the query
    expect((result[1] as any).query).toBe(baseQuery);
  });

  it('should handle multiple categories', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
      {
        name: 'test-users',
        type: SearchResultType.USER,
        category: SearchCategory.CONTRIBUTORS,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 10 },
    });

    // Two categories -> 2 headers + 2 bodies = 4 items
    expect(result).toHaveLength(4);
  });

  it('should apply size multiplier from options', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 10 },
      sizeMultiplier: 3,
    });

    // Body is at index 1
    expect((result[1] as any).size).toBe(30); // 10 * 3
  });

  it('should use filter size when available', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      filters: [{ category: SearchCategory.SPACES, size: 8 }] as any,
      defaults: { size: 10 },
      sizeMultiplier: 2,
    });

    expect((result[1] as any).size).toBe(16); // 8 * 2
  });

  it('should use default sizeMultiplier of 2 when not provided', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 5 },
    });

    expect((result[1] as any).size).toBe(10); // 5 * 2 (default multiplier)
  });

  it('should include search_after when cursor is provided', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      filters: [
        { category: SearchCategory.SPACES, size: 5, cursor: '3.5::some-id' },
      ] as any,
      defaults: { size: 10 },
    });

    expect((result[1] as any).search_after).toEqual([3.5, 'some-id']);
  });

  it('should not include search_after when no cursor', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      filters: [{ category: SearchCategory.SPACES, size: 5 }] as any,
      defaults: { size: 10 },
    });

    expect((result[1] as any).search_after).toBeUndefined();
  });

  it('should set _source to false and fields to [id, type]', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 10 },
    });

    const body = result[1] as any;
    expect(body._source).toBe(false);
    expect(body.fields).toEqual(['id', 'type']);
  });

  it('should sort by _score desc and id desc', () => {
    const indices: SearchIndex[] = [
      {
        name: 'test-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];

    const result = buildMultiSearchRequestItems(indices, baseQuery, {
      defaults: { size: 10 },
    });

    const body = result[1] as any;
    expect(body.sort).toEqual({ _score: 'desc', id: 'desc' });
  });
});
