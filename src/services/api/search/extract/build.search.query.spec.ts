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

  it('should build a "field-absent OR field-equals" filter for calloutsSetIdFilter', () => {
    const query = buildSearchQuery('test', {
      calloutsSetIdFilter: 'cs-123',
    });

    const filter = query.bool?.filter as any;
    expect(filter.bool.must).toHaveLength(1);
    const innerBool = filter.bool.must[0].bool;
    expect(innerBool.minimum_should_match).toBe(1);
    expect(innerBool.should[0].bool.must_not.exists.field).toBe(
      'calloutsSetID'
    );
    expect(innerBool.should[1].term.calloutsSetID).toBe('cs-123');
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

  it('should combine calloutsSet + flowState scope filters (both required for zero leakage, SC-003)', () => {
    const query = buildSearchQuery('test', {
      calloutsSetIdFilter: 'cs-123',
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
        { calloutsSetID: 'cs-123' },
        { flowStateID: 'fs-456' },
      ])
    );
  });

  it('should combine space + calloutsSet + flowState scope filters together', () => {
    const query = buildSearchQuery('test', {
      spaceIdFilter: 'space-1',
      calloutsSetIdFilter: 'cs-123',
      flowStateIdFilter: 'fs-456',
    });

    const filter = query.bool?.filter as any;
    expect(filter.bool.must).toHaveLength(3);
  });

  it('should not add a scope filter when calloutsSet/flowState filters are undefined', () => {
    const query = buildSearchQuery('test', {
      calloutsSetIdFilter: undefined,
      flowStateIdFilter: undefined,
    });

    expect(query.bool?.filter).toBeUndefined();
  });
});
