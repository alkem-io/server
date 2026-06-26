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

  describe('matched-terms attribution (feature 010 / ADR 0001)', () => {
    it('leaves the scoring bool.must multi_match untouched when attribution tokens are added (ranking invariance, SC-004 / FR-009)', () => {
      const withoutAttribution = buildSearchQuery('hello world');
      const withAttribution = buildSearchQuery('hello world', {
        attributionTokens: ['hello', 'world'],
      });

      // the scoring clause is byte-identical with and without attribution
      expect(withAttribution.bool?.must).toEqual(withoutAttribution.bool?.must);
      expect(withAttribution.bool?.must).toEqual([
        {
          multi_match: {
            query: 'hello world',
            type: 'most_fields',
            fields: ['*'],
          },
        },
      ]);
    });

    it('adds one named boost:0 should clause per attribution token (so _score cannot change)', () => {
      const query = buildSearchQuery('hello world', {
        attributionTokens: ['hello', 'world'],
      });

      const should = query.bool?.should as any[];
      expect(should).toHaveLength(2);
      should.forEach((clause: any) => {
        // every attribution clause contributes nothing to the score
        expect(clause.multi_match.boost).toBe(0);
        // named, so it surfaces in hit.matched_queries
        expect(typeof clause.multi_match._name).toBe('string');
        // attributes across ALL fields incl. deep body content (US2 / FR-002)
        expect(clause.multi_match.fields).toEqual(['*']);
      });
      // distinct, collision-safe names per token
      const names = should.map((c: any) => c.multi_match._name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('does not add a should clause when no attribution tokens are provided', () => {
      const query = buildSearchQuery('hello world');
      expect(query.bool?.should).toBeUndefined();
    });

    it('does not add a should clause for an empty attribution token list', () => {
      const query = buildSearchQuery('hello world', { attributionTokens: [] });
      expect(query.bool?.should).toBeUndefined();
    });

    it('caps the number of named attribution clauses defensively', () => {
      const manyTokens = Array.from({ length: 60 }, (_, i) => `t${i}`);
      const query = buildSearchQuery(manyTokens.join(' '), {
        attributionTokens: manyTokens,
      });

      const should = query.bool?.should as any[];
      // capped well below the input length
      expect(should.length).toBeLessThan(manyTokens.length);
      expect(should.length).toBeLessThanOrEqual(25);
    });
  });
});
