import { buildSearchQuery } from './build.search.query';

describe('buildSearchQuery', () => {
  it('should OR an exact all-fields match with a content-scoped fuzzy match', () => {
    const query = buildSearchQuery('hello world');

    expect(query.bool?.must).toBeDefined();
    // The text match is a single should-block: exact-all-fields OR fuzzy-content.
    const textMatch = (query.bool?.must as any[])[0].bool;
    expect(textMatch.minimum_should_match).toBe(1);
    expect(textMatch.should).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          multi_match: {
            query: 'hello world',
            type: 'most_fields',
            fields: ['*'],
          },
        }),
        expect.objectContaining({
          // fuzziness is scoped to `content` only — never applied via fields:['*']
          match: {
            content: {
              query: 'hello world',
              fuzziness: 'AUTO',
              prefix_length: 2,
              max_expansions: 50,
            },
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

  it('should build a "field-absent OR field-equals" filter for flowStateIdFilter', () => {
    const query = buildSearchQuery('test', {
      flowStateIdFilter: 'fs-456',
    });

    const filter = query.bool?.filter as any;
    expect(filter.bool.must).toHaveLength(1);
    const innerBool = filter.bool.must[0].bool;
    expect(innerBool.minimum_should_match).toBe(1);
    expect(innerBool.should[0].bool.must_not.exists.field).toBe('flowStateID');
    expect(innerBool.should[1].term.flowStateID).toBe('fs-456');
  });

  it('should combine space + flowState scope filters together', () => {
    // flowState UUID alone scopes; spaceID is the only other scope filter
    const query = buildSearchQuery('test', {
      spaceIdFilter: 'space-1',
      flowStateIdFilter: 'fs-456',
    });

    const filter = query.bool?.filter as any;
    // both scope clauses present, each as an independent should-block
    expect(filter.bool.must).toHaveLength(2);
    const fields = filter.bool.must.map(
      (clause: any) => clause.bool.should[1].term
    );
    expect(fields).toEqual(
      expect.arrayContaining([
        { spaceID: 'space-1' },
        { flowStateID: 'fs-456' },
      ])
    );
  });

  it('should not add a scope filter when space/flowState filters are undefined', () => {
    const query = buildSearchQuery('test', {
      spaceIdFilter: undefined,
      flowStateIdFilter: undefined,
    });

    expect(query.bool?.filter).toBeUndefined();
  });
});
