import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Space } from './space.entity';

/**
 * The main alias of every builder `accountScopedSpaceQuery` hands back.
 *
 * It is exported, and callers MUST spell their own joins and selects against
 * it (`addSelect(`${ACCOUNT_SCOPED_SPACE_ALIAS}.id`)`,
 * `innerJoinAndSelect(`${ACCOUNT_SCOPED_SPACE_ALIAS}.authorization`, ...)`)
 * rather than hard-coding a string. A caller that hard-codes a different
 * alias throws at query-build time only on a real database — every spec in
 * this repo mocks `createQueryBuilder` (`vitest.config.ts`, `environment:
 * 'node'`, no Postgres), so no unit gate can catch the mismatch.
 */
export const ACCOUNT_SCOPED_SPACE_ALIAS = 'space';

/**
 * THE single implementation of "belongs to the host space's account"
 * (workspace#084 FR-002 / FR-004a). `T004` (the CUSTOM read path) and `T008`
 * (the picker's candidate query) call this; they do not re-write the join.
 *
 * One SQL statement, exposed as a query builder so each caller selects exactly
 * what it needs inside it — one query per caller, never a host-account lookup
 * followed by a scope lookup.
 *
 * `space.accountId` is meaningfully populated on LEVEL-ZERO rows only (see
 * `SpaceService.getAccountForLevelZeroSpaceOrFail`, which resolves the account
 * through `levelZeroSpaceID` for exactly that reason). A second copy of this
 * predicate that filtered `space."accountId"` directly would therefore be
 * wrong for every L1/L2 in a way no unit gate catches — hence one owner.
 * An L0's `levelZeroSpaceID` is its own id, so the join is uniform for
 * L0/L1/L2.
 *
 * NO column restriction is applied here, and callers that return `ISpace`
 * MUST NOT add one. `ISpace.level`, `.visibility`, `.sortOrder` and `.pinned`
 * are non-null `@Field` properties read straight off the entity and the
 * shipped client fragment selects all four, so a restricted select leaves them
 * `undefined`, nullifies every element and then the whole `[ISpace!]!` list —
 * i.e. the collection renders as an error for every viewer including the admin
 * (workspace#084 FR-017; carried finding COMP-084-R5-06). The one place a
 * column-restricted select is legitimate is `accountScopedSpaceIds` below,
 * which returns ids and no entity at all.
 *
 * `candidateIds` is NEVER `[]`. Its absent form means *the whole account*, so
 * an empty array must never be normalized into it — that would render every
 * readable space of the account for a callout that selects none. Both
 * id-filtering callers short-circuit on an empty list before they get here.
 *
 * A host space whose account cannot be resolved yields an EMPTY scope; the
 * caller decides what that means (the write guard then rejects every newly
 * added id; the read path never calls this at all for an empty selection).
 */
export const accountScopedSpaceQuery = (
  manager: EntityManager,
  hostSpaceId: string,
  candidateIds?: string[]
): SelectQueryBuilder<Space> => {
  const query = manager
    .createQueryBuilder(Space, ACCOUNT_SCOPED_SPACE_ALIAS)
    .innerJoin(
      Space,
      'accountScopeLevelZero',
      `accountScopeLevelZero.id = ${ACCOUNT_SCOPED_SPACE_ALIAS}.levelZeroSpaceID`
    )
    .where(
      `accountScopeLevelZero.accountId = (SELECT "accountScopeHostLevelZero"."accountId" FROM "space" "accountScopeHost" INNER JOIN "space" "accountScopeHostLevelZero" ON "accountScopeHostLevelZero"."id" = "accountScopeHost"."levelZeroSpaceID" WHERE "accountScopeHost"."id" = :accountScopeHostSpaceId)`,
      { accountScopeHostSpaceId: hostSpaceId }
    );

  if (candidateIds) {
    query.andWhere(
      `${ACCOUNT_SCOPED_SPACE_ALIAS}.id IN (:...accountScopeCandidateIds)`,
      { accountScopeCandidateIds: candidateIds }
    );
  }

  return query;
};

/**
 * Ids-only form of the predicate above, for the write guard — the ONLY caller
 * that wants no entity, and so the only place a column-restricted select is
 * correct. Keeping it here is what lets `accountScopedSpaceQuery` promise
 * whole rows to its entity callers.
 *
 * `candidateIds` is required and must be non-empty (see above).
 */
export const accountScopedSpaceIds = async (
  manager: EntityManager,
  hostSpaceId: string,
  candidateIds: string[]
): Promise<Set<string>> => {
  const rows = await accountScopedSpaceQuery(manager, hostSpaceId, candidateIds)
    .select(`${ACCOUNT_SCOPED_SPACE_ALIAS}.id`, 'id')
    .getRawMany<{ id: string }>();

  return new Set(rows.map(row => row.id));
};
