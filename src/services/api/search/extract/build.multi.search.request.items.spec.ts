import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';
import { buildMultiSearchRequestItems } from './build.multi.search.request.items';

describe('buildMultiSearchRequestItems', () => {
  const searchQuery = {
    bool: {
      must: [
        {
          multi_match: {
            query: 'test',
            type: 'most_fields' as const,
            fields: ['*'],
          },
        },
      ],
    },
  };

  it('should build request items for a single category', () => {
    const indices = [
      {
        name: 'alkemio-data-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];
    const result = buildMultiSearchRequestItems(indices, searchQuery, {
      defaults: { size: 10 },
    });
    // header + body = 2 items
    expect(result).toHaveLength(2);
    expect((result[0] as any).index).toEqual(['alkemio-data-spaces']);
    expect((result[1] as any).size).toBe(20); // 10 * 2 (default sizeMultiplier)
  });

  it('should group indices by category', () => {
    const indices = [
      {
        name: 'alkemio-data-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
      {
        name: 'alkemio-data-subspaces',
        type: SearchResultType.SUBSPACE,
        category: SearchCategory.SPACES,
      },
      {
        name: 'alkemio-data-users',
        type: SearchResultType.USER,
        category: SearchCategory.CONTRIBUTORS,
      },
    ];
    const result = buildMultiSearchRequestItems(indices, searchQuery, {
      defaults: { size: 5 },
    });
    // 2 categories * 2 (header+body) = 4
    expect(result).toHaveLength(4);
    // First category should have both space indices
    expect((result[0] as any).index).toEqual([
      'alkemio-data-spaces',
      'alkemio-data-subspaces',
    ]);
  });

  it('should use filter size and cursor when provided', () => {
    const indices = [
      {
        name: 'alkemio-data-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];
    const result = buildMultiSearchRequestItems(indices, searchQuery, {
      filters: [
        {
          category: SearchCategory.SPACES,
          size: 15,
          cursor: '10::550e8400-e29b-41d4-a716-446655440000',
        },
      ],
      defaults: { size: 5 },
    });
    expect((result[1] as any).size).toBe(30); // 15 * 2
    expect((result[1] as any).search_after).toEqual([
      10,
      '550e8400-e29b-41d4-a716-446655440000',
    ]);
  });

  it('should use custom sizeMultiplier', () => {
    const indices = [
      {
        name: 'alkemio-data-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];
    const result = buildMultiSearchRequestItems(indices, searchQuery, {
      sizeMultiplier: 3,
      defaults: { size: 10 },
    });
    expect((result[1] as any).size).toBe(30); // 10 * 3
  });

  it('should set search_after to undefined when no cursor', () => {
    const indices = [
      {
        name: 'alkemio-data-spaces',
        type: SearchResultType.SPACE,
        category: SearchCategory.SPACES,
      },
    ];
    const result = buildMultiSearchRequestItems(indices, searchQuery, {
      defaults: { size: 5 },
    });
    expect((result[1] as any).search_after).toBeUndefined();
  });

  it('should return empty array when no indices provided', () => {
    const result = buildMultiSearchRequestItems([], searchQuery, {
      defaults: { size: 5 },
    });
    expect(result).toHaveLength(0);
  });
});
