import { EntityManager } from 'typeorm';
import {
  ACCOUNT_SCOPED_SPACE_ALIAS,
  accountScopedSpaceIds,
  accountScopedSpaceQuery,
} from './account.scope';
import { Space } from './space.entity';

/**
 * BE HONEST ABOUT WHAT THIS SPEC CAN PROVE.
 *
 * A unit assertion against a mocked repository is NOT proof of a SQL join.
 * `vitest` runs `environment: 'node'` with hand-wired repository mocks and NO
 * database (`vitest.config.ts`): `createQueryBuilder` is a mock and
 * `getMany` / `getRawMany` return whatever the test fed them. "The predicate
 * returns the account's L0/L1/L2 and nothing from another account" therefore
 * restates the fixture and passes IDENTICALLY against a predicate that joined
 * `space."accountId"` directly — which is exactly the defect FR-004a exists to
 * prevent. Only a statement executed against Postgres distinguishes the two,
 * and that is what the `test-suites` it-spec (wave 4, T201-T203) is for.
 *
 * Do NOT "strengthen" this spec by adding set-semantics assertions; they would
 * be theatre. What a mock CAN honestly carry is asserted below: the statement's
 * shape, its round-trip count, its alias, the structure of the predicate as a
 * string (the one thing the builder itself determines), and the absence of any
 * column restriction.
 */
describe('accountScopedSpaceQuery / accountScopedSpaceIds (T001)', () => {
  const makeBuilder = () => {
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    const chain = (name: string) => {
      builder[name] = vi.fn(() => builder);
    };
    for (const name of [
      'innerJoin',
      'innerJoinAndSelect',
      'leftJoin',
      'where',
      'andWhere',
      'select',
      'addSelect',
      'limit',
    ]) {
      chain(name);
    }
    builder.getRawMany = vi.fn().mockResolvedValue([]);
    builder.getMany = vi.fn().mockResolvedValue([]);
    return builder;
  };

  let builder: ReturnType<typeof makeBuilder>;
  let manager: EntityManager;

  beforeEach(() => {
    builder = makeBuilder();
    manager = {
      createQueryBuilder: vi.fn(() => builder),
    } as unknown as EntityManager;
  });

  const joinCondition = () => String(builder.innerJoin.mock.calls[0][2]);
  const whereClause = () => String(builder.where.mock.calls[0][0]);

  it('builds exactly ONE statement, on the exported alias', () => {
    accountScopedSpaceQuery(manager, 'host-1');

    expect(ACCOUNT_SCOPED_SPACE_ALIAS).toBe('space');
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
    // FEAS-084-R5-02: the alias every consumer spells its joins against. A
    // mismatch here throws only against a real database.
    expect(manager.createQueryBuilder).toHaveBeenCalledWith(
      Space,
      ACCOUNT_SCOPED_SPACE_ALIAS
    );
  });

  it('resolves the account THROUGH levelZeroSpaceID, never off the candidate row', () => {
    accountScopedSpaceQuery(manager, 'host-1');

    // The candidate's own L0 row is joined in...
    expect(builder.innerJoin).toHaveBeenCalledTimes(1);
    expect(joinCondition()).toContain('levelZeroSpaceID');

    // ...and the account test is applied to THAT row, not to the candidate.
    // `space.accountId` is meaningfully populated on level-zero rows only, so
    // a predicate reading it off the candidate is wrong for every L1/L2 —
    // FR-004a, and the whole reason this helper has one owner.
    expect(whereClause()).toContain('accountScopeLevelZero.accountId');
    expect(whereClause()).not.toContain(
      `${ACCOUNT_SCOPED_SPACE_ALIAS}.account`
    );

    // The host's account is resolved in the SAME statement as a correlated
    // subquery — not as a separate levelZeroSpaceID read followed by an
    // accountId read (the two-step lookup this helper replaced).
    expect(whereClause()).toContain('SELECT');
    expect(whereClause()).toContain('levelZeroSpaceID');
    expect(builder.where).toHaveBeenCalledTimes(1);
    expect(builder.getMany).not.toHaveBeenCalled();
    expect(builder.getRawMany).not.toHaveBeenCalled();
  });

  it('applies the id filter when candidateIds is given', () => {
    accountScopedSpaceQuery(manager, 'host-1', ['a', 'b']);

    expect(builder.andWhere).toHaveBeenCalledTimes(1);
    expect(String(builder.andWhere.mock.calls[0][0])).toContain(
      `${ACCOUNT_SCOPED_SPACE_ALIAS}.id IN`
    );
    expect(builder.andWhere.mock.calls[0][1]).toEqual({
      accountScopeCandidateIds: ['a', 'b'],
    });
  });

  it('omits the id filter when candidateIds is absent (the whole account)', () => {
    accountScopedSpaceQuery(manager, 'host-1');

    expect(builder.andWhere).not.toHaveBeenCalled();
  });

  /**
   * COMP-084-R5-06 (carried MUST-FIX). The predicate hands its entity callers
   * WHOLE `space` rows. `ISpace.level`, `.visibility`, `.sortOrder` and
   * `.pinned` are non-null `@Field` properties read off the entity and the
   * shipped `subspaceCard` fragment selects all four, so a column-restricted
   * select leaves them `undefined`, nullifies every element and then the whole
   * `[ISpace!]!` list — the collection renders as an error for EVERY viewer,
   * the admin included (FR-017).
   *
   * This case is RED against any future change that restricts columns inside
   * the shared statement (e.g. `.select(['space.id'])` "because the read path
   * only needs ids"). The exclusion the design actually wants is of RELATIONS,
   * not of COLUMNS.
   */
  it('restricts NO columns — entity callers get whole rows', () => {
    accountScopedSpaceQuery(manager, 'host-1', ['a']);

    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.addSelect).not.toHaveBeenCalled();
  });

  describe('accountScopedSpaceIds', () => {
    it('is the one place a column-restricted select is correct, and costs ONE round trip', async () => {
      builder.getRawMany.mockResolvedValue([{ id: 'a' }, { id: 'c' }]);

      const result = await accountScopedSpaceIds(manager, 'host-1', [
        'a',
        'b',
        'c',
      ]);

      expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(builder.getRawMany).toHaveBeenCalledTimes(1);
      expect(builder.select).toHaveBeenCalledWith(
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.id`,
        'id'
      );
      expect(result).toEqual(new Set(['a', 'c']));
    });
  });
});
