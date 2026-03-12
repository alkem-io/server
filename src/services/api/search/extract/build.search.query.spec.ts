import { buildSearchQuery } from './build.search.query';

describe('buildSearchQuery', () => {
  it('should build a basic multi_match query without filters', () => {
    const result = buildSearchQuery('test query');
    expect(result.bool?.must).toEqual([
      {
        multi_match: {
          query: 'test query',
          type: 'most_fields',
          fields: ['*'],
        },
      },
    ]);
    expect(result.bool?.filter).toBeUndefined();
  });

  it('should add spaceIdFilter when provided', () => {
    const result = buildSearchQuery('test', {
      spaceIdFilter: 'space-123',
    });
    expect(result.bool?.filter).toBeDefined();
    const filter = result.bool?.filter as any;
    expect(filter.bool.must).toHaveLength(1);
    const spaceFilter = filter.bool.must[0];
    expect(spaceFilter.bool.minimum_should_match).toBe(1);
    expect(spaceFilter.bool.should).toHaveLength(2);
    // Should include must_not exists for entities without spaceID
    expect(spaceFilter.bool.should[0].bool.must_not.exists.field).toBe(
      'spaceID'
    );
    // Should include term filter for spaceID
    expect(spaceFilter.bool.should[1].term.spaceID).toBe('space-123');
  });

  it('should not add filter when spaceIdFilter is undefined', () => {
    const result = buildSearchQuery('test', { spaceIdFilter: undefined });
    expect(result.bool?.filter).toBeUndefined();
  });

  it('should not add filter when options is undefined', () => {
    const result = buildSearchQuery('test');
    expect(result.bool?.filter).toBeUndefined();
  });
});
