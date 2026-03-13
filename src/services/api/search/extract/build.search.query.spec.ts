import { buildSearchQuery } from './build.search.query';

describe('buildSearchQuery', () => {
  it('should build a basic multi_match query with no filters', () => {
    const query = buildSearchQuery('hello world');

    expect(query.bool?.must).toBeDefined();
    expect(query.bool?.must).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          multi_match: {
            query: 'hello world',
            type: 'most_fields',
            fields: ['*'],
          },
        }),
      ])
    );
    expect(query.bool?.filter).toBeUndefined();
  });

  it('should build a query with no options', () => {
    const query = buildSearchQuery('test');

    expect(query.bool?.filter).toBeUndefined();
  });

  it('should build a query with spaceIdFilter', () => {
    const query = buildSearchQuery('test', { spaceIdFilter: 'space-123' });

    expect(query.bool?.filter).toBeDefined();
    // The filter should contain a bool with minimum_should_match and should clauses
    const filter = query.bool?.filter as any;
    expect(filter.bool.must).toBeDefined();
    const innerBool = filter.bool.must[0].bool;
    expect(innerBool.minimum_should_match).toBe(1);
    expect(innerBool.should).toHaveLength(2);
  });

  it('should include must_not exists and term filter for spaceIdFilter', () => {
    const query = buildSearchQuery('test', { spaceIdFilter: 'space-123' });

    const filter = query.bool?.filter as any;
    const shouldClauses = filter.bool.must[0].bool.should;

    // First clause: must_not exists spaceID
    expect(shouldClauses[0].bool.must_not.exists.field).toBe('spaceID');
    // Second clause: term spaceID
    expect(shouldClauses[1].term.spaceID).toBe('space-123');
  });

  it('should not add filter when spaceIdFilter is undefined', () => {
    const query = buildSearchQuery('test', { spaceIdFilter: undefined });

    expect(query.bool?.filter).toBeUndefined();
  });

  it('should not add filter when options is empty object', () => {
    const query = buildSearchQuery('test', {});

    expect(query.bool?.filter).toBeUndefined();
  });
});
