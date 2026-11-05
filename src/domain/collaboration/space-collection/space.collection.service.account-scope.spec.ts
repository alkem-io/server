import { AuthorizationPrivilege } from '@common/enums';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  ACCOUNT_SCOPED_SPACE_ALIAS,
  accountScopedSpaceQuery,
} from '@domain/space/space/account.scope';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import type { Mocked } from 'vitest';
import { SpaceCollectionService } from './space.collection.service';

// This suite replaces a dependency that an earlier suite may already have loaded.
vi.hoisted(() => vi.resetModules());

// The shared account-scope predicate is mocked so this suite can assert WHICH
// predicate the read path uses and WHAT it passes it. Its own statement shape
// is proven in `account.scope.spec.ts`, and its SQL set semantics only against
// real Postgres (the wave-4 `test-suites` it-spec) — never here.
vi.mock('@domain/space/space/account.scope', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@domain/space/space/account.scope')>();
  return { ...actual, accountScopedSpaceQuery: vi.fn() };
});

/**
 * The CUSTOM read path and the per-viewer `hasHiddenSpaces` flag
 * (workspace#084, T004-T006 / FR-016..FR-020, AC5, AC6).
 *
 * ## What this suite replaces
 *
 * `space.collection.service.spec.ts` kept its AUTO cases and handed four CUSTOM
 * ones over, because the CUSTOM branch no longer resolves spaces through
 * `CommunityResolverService`:
 *   - 'CUSTOM + selected subset' MOVED here, minus its pinned-first order
 *     assertion — FR-019 retires server-side ordering of a CUSTOM result.
 *   - '[S4] CUSTOM + foreign persisted id ⇒ dropped' is SUPERSEDED by
 *     'a selected space that has LEFT the account is dropped'. Its semantics
 *     invert: a same-account non-subspace is now RETURNED, which is the whole
 *     point of the feature, and what gets dropped is a space that has left the
 *     account.
 *   - 'CUSTOM + all selected deleted ⇒ empty' moved, now paired with
 *     `hasHiddenSpaces === false` (a departed entry is stale, not hidden).
 *   - '[S7-read] CUSTOM ordering' is RETIRED by FR-019, and the replacement
 *     asserts the opposite: the query's row order survives untouched.
 *
 * ## Each rung is asserted ONCE, on BOTH public methods
 *
 * `getSubspaces` and `hasHiddenSpaces` delegate to one private
 * `resolveSelection`, so every short-circuit is written once and asserted once
 * — on both results inside a single case. That is what makes FR-018's
 * "derived from the same pass" structural rather than prose: two independently
 * written ladders could disagree and render AUTO content beside a per-viewer
 * withheld flag.
 */
describe('SpaceCollectionService — CUSTOM account scope (T004-T006)', () => {
  let service: SpaceCollectionService;
  let communityResolver: Mocked<CommunityResolverService>;
  let authorizationService: Mocked<AuthorizationService>;
  let entityManager: { findOne: ReturnType<typeof vi.fn> };
  let builder: Record<string, ReturnType<typeof vi.fn>>;

  const actorContext = { credentials: [] } as unknown as ActorContext;

  const makeBuilder = (rows: Space[]) => {
    const b: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of [
      'innerJoin',
      'innerJoinAndSelect',
      'leftJoin',
      'leftJoinAndSelect',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'limit',
    ]) {
      b[name] = vi.fn(() => b);
    }
    b.getMany = vi.fn().mockResolvedValue(rows);
    b.getRawMany = vi.fn().mockResolvedValue([]);
    return b;
  };

  /** A whole `space` row as the predicate hands it back: every non-null
   * `@Field` the shipped `subspaceCard` fragment selects, plus the
   * authorization relation. */
  const spaceRow = (id: string, overrides: Partial<Space> = {}): Space =>
    ({
      id,
      level: SpaceLevel.L1,
      visibility: SpaceVisibility.ACTIVE,
      sortOrder: 0,
      pinned: false,
      authorization: { id: `auth-${id}` },
      ...overrides,
    }) as unknown as Space;

  const customCallout = (
    selectedIds: string[],
    framingType: CalloutFramingType = CalloutFramingType.SPACES
  ): ICallout =>
    ({
      id: 'callout-1',
      framing: { id: 'framing-1', type: framingType },
      settings: {
        framing: {
          selection: { mode: CalloutSelectionMode.CUSTOM, selectedIds },
        },
      },
    }) as unknown as ICallout;

  /** Rows the query returned, in the order it returned them. */
  const queryReturns = (...rows: Space[]) => {
    builder = makeBuilder(rows);
    vi.mocked(accountScopedSpaceQuery).mockReturnValue(builder as never);
  };

  const grantReadOn = (...ids: string[]) => {
    const granted = new Set(ids.map(id => `auth-${id}`));
    authorizationService.isAccessGranted.mockImplementation(
      (_actor, authorization, privilege) =>
        privilege === AuthorizationPrivilege.READ &&
        granted.has((authorization as { id: string })?.id)
    );
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(accountScopedSpaceQuery).mockReset();
    queryReturns();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceCollectionService,
        {
          provide: CommunityResolverService,
          useValue: {
            getSpaceWithSubspacesFromCollaborationCallout: vi.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: { isAccessGranted: vi.fn() },
        },
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            findOne: vi.fn().mockResolvedValue({ id: 'host-space' }),
          },
        },
      ],
    }).compile();

    service = module.get(SpaceCollectionService);
    communityResolver = module.get(CommunityResolverService);
    authorizationService = module.get(AuthorizationService);
    entityManager = module.get(getEntityManagerToken('default'));
  });

  describe('the account-widened result (AC5 / FR-016)', () => {
    it('returns a sibling L0 of the account and an L2 of another tree', async () => {
      queryReturns(
        spaceRow('sibling-l0', { level: SpaceLevel.L0 }),
        spaceRow('other-tree-l2', { level: SpaceLevel.L2 })
      );
      grantReadOn('sibling-l0', 'other-tree-l2');

      const callout = customCallout(['sibling-l0', 'other-tree-l2']);

      expect(
        (await service.getSubspaces(callout, actorContext)).map(s => s.id)
      ).toEqual(['sibling-l0', 'other-tree-l2']);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);

      // Routed through THE shared predicate — not a local re-written join —
      // with the stored ids as its filter (FR-004a). ONE query per call, and
      // the two resolve fields each pay their own: spec A20 accepts the
      // duplicated pass and explicitly forbids a shared per-request cache or
      // dataloader between them, so the cost is stated here rather than
      // optimized away.
      expect(accountScopedSpaceQuery).toHaveBeenCalledTimes(2);
      expect(accountScopedSpaceQuery).toHaveBeenCalledWith(
        expect.anything(),
        'host-space',
        ['sibling-l0', 'other-tree-l2']
      );
    });

    it('never pays for the host subspace tree the CUSTOM branch would discard', async () => {
      queryReturns(spaceRow('a'));
      grantReadOn('a');

      await service.getSubspaces(customCallout(['a']), actorContext);

      // `getSpaceWithSubspacesFromCollaborationCallout` eagerly loads the
      // host's subspaces AND their About profiles, all of which CUSTOM throws
      // away — and it would be paid once per resolve field. The CUSTOM branch
      // resolves the host id with one light lookup instead.
      expect(
        communityResolver.getSpaceWithSubspacesFromCollaborationCallout
      ).not.toHaveBeenCalled();
      expect(entityManager.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('what the query loads (FR-017 / FR-019)', () => {
    /**
     * COMP-084-R5-06, carried as a MUST-FIX acceptance criterion of this chunk.
     *
     * `ISpace.level`, `.visibility`, `.sortOrder` and `.pinned` are non-null
     * `@Field` properties read straight off the entity, and the shipped
     * consumer fragment (`subspaceCard.graphql`) selects all four. A
     * column-restricted select — `.select(['space.id'])`, the natural and
     * cheaper reading of "load no other relation" — leaves them `undefined`,
     * which nullifies every element and then the whole `[ISpace!]!` list: the
     * collection renders as a GraphQL error for EVERY viewer, the admin
     * included. That is the exact total-collection failure FR-017 exists to
     * prevent, and no other gate in this repo is RED against it.
     *
     * The exclusion this design wants is of RELATIONS, not of COLUMNS.
     */
    it('selects WHOLE rows — no column restriction anywhere on the statement', async () => {
      queryReturns(spaceRow('a'));
      grantReadOn('a');

      const result = await service.getSubspaces(
        customCallout(['a']),
        actorContext
      );

      expect(builder.select).not.toHaveBeenCalled();
      expect(builder.addSelect).not.toHaveBeenCalled();
      // ...and what comes back therefore carries the four non-null scalars the
      // consumer fragment selects.
      expect(result[0]).toMatchObject({
        level: expect.anything(),
        visibility: expect.anything(),
        sortOrder: expect.anything(),
        pinned: expect.anything(),
      });
    });

    it('loads the authorization relation with an INNER join, and no other relation', async () => {
      queryReturns(spaceRow('a'));
      grantReadOn('a');

      await service.getSubspaces(customCallout(['a']), actorContext);

      expect(builder.innerJoinAndSelect).toHaveBeenCalledTimes(1);
      expect(builder.innerJoinAndSelect).toHaveBeenCalledWith(
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.authorization`,
        'authorization'
      );
      // No `about`, no profile, no visuals — and INNER, not LEFT:
      // `isAccessGranted` THROWS on an undefined policy, and a left join
      // yields null for a row whose `authorizationId` is null (that FK is ON
      // DELETE SET NULL). One policy-less row in a stored selection would
      // otherwise fail the whole collection for every viewer; the inner join
      // drops it in SQL, which is shrink-only and needs no null check.
      expect(builder.leftJoin).not.toHaveBeenCalled();
      expect(builder.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('does NOT order the CUSTOM result — the query row order survives (FR-019)', async () => {
      // `orderSubspaces` would put the pinned row first and then sort by
      // sortOrder; pinned/sortOrder are PARENT-relative, so across a
      // cross-parent selection they are meaningless and the single consumer
      // re-partitions the whole list client-side anyway. This case is RED
      // against any server-side ordering of the CUSTOM branch.
      queryReturns(
        spaceRow('late-unpinned', { sortOrder: 99 }),
        spaceRow('pinned', { pinned: true, sortOrder: 50 }),
        spaceRow('early-unpinned', { sortOrder: 1 })
      );
      grantReadOn('late-unpinned', 'pinned', 'early-unpinned');

      const result = await service.getSubspaces(
        customCallout(['late-unpinned', 'pinned', 'early-unpinned']),
        actorContext
      );

      expect(result.map(s => s.id)).toEqual([
        'late-unpinned',
        'pinned',
        'early-unpinned',
      ]);
      expect(builder.orderBy).not.toHaveBeenCalled();
      expect(builder.addOrderBy).not.toHaveBeenCalled();
    });
  });

  describe('the per-viewer READ filter (SC-003 / ruling D1)', () => {
    it('omits a selected space the viewer cannot READ and raises the flag', async () => {
      queryReturns(spaceRow('visible'), spaceRow('hidden'));
      grantReadOn('visible');

      const callout = customCallout(['visible', 'hidden']);

      expect(
        (await service.getSubspaces(callout, actorContext)).map(s => s.id)
      ).toEqual(['visible']);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(true);
    });

    /**
     * THE case that pins ruling D1, and the only one that does.
     *
     * An L0 space's About is readable by every actor including anonymous
     * unless the space is ARCHIVED: `getAccessPrivilegesFor*` push READ_ABOUT
     * unconditionally for level 0 and withhold only READ. So a READ_ABOUT
     * filter withholds nothing and lets a PRIVATE sibling L0 through — whose
     * card then nullifies the entire non-null collection. RED if the privilege
     * is ever "restored" to READ_ABOUT.
     */
    it('withholds a private sibling L0 the viewer can READ_ABOUT but not READ', async () => {
      queryReturns(spaceRow('private-sibling-l0', { level: SpaceLevel.L0 }));
      authorizationService.isAccessGranted.mockImplementation(
        (_actor, _authorization, privilege) =>
          privilege === AuthorizationPrivilege.READ_ABOUT
      );

      const callout = customCallout(['private-sibling-l0']);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(true);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.READ
      );
    });

    it('every selection withheld ⇒ empty list AND the flag raised', async () => {
      queryReturns(spaceRow('a'), spaceRow('b'));
      grantReadOn(); // nothing readable

      const callout = customCallout(['a', 'b']);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(true);
    });
  });

  describe('hidden vs stale (AC6 vs AC7 / FR-018)', () => {
    // These two cases are what stops the two states being merged: a withheld
    // space is still in the account and the viewer is told something is
    // hidden; a departed one is stale and silently vanishes.
    it('a selected space that has LEFT the account is dropped WITHOUT raising the flag', async () => {
      // Supersedes '[S4] CUSTOM + foreign persisted id ⇒ silently dropped'.
      // The id is simply absent from the predicate's result.
      queryReturns(spaceRow('still-in-account'));
      grantReadOn('still-in-account');

      const callout = customCallout(['still-in-account', 'left-the-account']);

      expect(
        (await service.getSubspaces(callout, actorContext)).map(s => s.id)
      ).toEqual(['still-in-account']);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
    });

    it('every selection stale (all deleted / departed) ⇒ empty list AND the flag FALSE', async () => {
      queryReturns(); // the predicate returns nothing at all

      const callout = customCallout(['gone-1', 'gone-2']);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });
  });

  describe('the short-circuit ladder — one owner, asserted once', () => {
    it('(a) a non-SPACES framing costs NO lookup of any kind', async () => {
      const callout = customCallout(['a'], CalloutFramingType.WHITEBOARD);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(entityManager.findOne).not.toHaveBeenCalled();
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
    });

    it('(a) a CONTRIBUTORS callout in CUSTOM mode never runs the SPACE query', async () => {
      // The framing KIND is `callout.framing.type`. It is NOT anywhere in
      // `callout.settings.framing`, which carries only commentsEnabled,
      // contributors, selection and spaces. An implementer who reads only
      // `settings.framing.selection` runs the account-scope SPACE query over
      // CONTRIBUTOR ids on every render of such a callout.
      const callout = customCallout(
        ['user-1', 'org-2'],
        CalloutFramingType.CONTRIBUTORS
      );

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('(b) an EMPTY stored selection costs ZERO queries and never reaches the predicate', async () => {
      // RED against an implementation that normalizes `[]` into the
      // predicate's absent-filter form: that form means THE WHOLE ACCOUNT, so
      // it would render every readable space of the account for a callout that
      // selects none — with the flag wrong as well.
      const callout = customCallout([]);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(entityManager.findOne).not.toHaveBeenCalled();
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
    });

    it('(c) an unresolved host space costs ONE light lookup and NO account query', async () => {
      // One host lookup is UNAVOIDABLE and expected: `callout.calloutsSet` is
      // not eager, so "has no host space" is not knowable without asking.
      // Asserting "no host lookup" here would be unsatisfiable, and the
      // tempting proxy (`isTemplate`) answers correctly for templates while
      // silently taking the query path for a knowledge-base-hosted callout.
      entityManager.findOne.mockResolvedValue(null);

      const callout = customCallout(['a']);

      expect(await service.getSubspaces(callout, actorContext)).toEqual([]);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
    });
  });

  describe('AUTO is untouched (AC8 / SC-005 / FR-018b)', () => {
    const hostSpaceWithSubs = () =>
      ({
        id: 'host-space',
        subspaces: [
          { id: 'a', sortOrder: 30, pinned: false, about: {} },
          { id: 'b', sortOrder: 10, pinned: false, about: {} },
          { id: 'c', sortOrder: 20, pinned: true, about: {} },
        ],
      }) as never;

    it('AUTO pays ZERO authorization checks and ZERO account queries, and still orders pinned-first', async () => {
      // The most likely way to break AC8 is to apply the new filter
      // unconditionally; this case is RED against that.
      //
      // It is ALSO the case that pins the FLAG side of the mode rung
      // (FR-018b). The account query is primed with an UNREADABLE row, so if
      // `hasHiddenSpaces` ever took the CUSTOM path for this AUTO callout —
      // the harmful divergence, since 025 permits an AUTO callout to carry a
      // non-empty inert `selectedIds` — the flag would come back `true` and
      // the `toBe(false)` below fails on the VALUE, not merely on the
      // mock-call counts.
      queryReturns(spaceRow('a'));
      grantReadOn(); // nothing readable
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout.mockResolvedValue(
        hostSpaceWithSubs()
      );

      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1', type: CalloutFramingType.SPACES },
        settings: {
          framing: {
            selection: { mode: CalloutSelectionMode.AUTO, selectedIds: ['a'] },
          },
        },
      } as unknown as ICallout;

      expect(
        (await service.getSubspaces(callout, actorContext)).map(s => s.id)
      ).toEqual(['c', 'b', 'a']);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
      expect(entityManager.findOne).not.toHaveBeenCalled();
    });

    it('a pre-025 callout with NO selection block: both public methods agree on AUTO', async () => {
      // The read side of the mode rung's single owner (FR-018b): RED against
      // a `getSubspaces` that reads `selection.mode` with NO default, which
      // takes the CUSTOM path for a pre-025 callout and renders an EMPTY
      // collection where the subspace list belongs.
      //
      // Be precise about what this case canNOT catch, so nobody mistakes it
      // for the whole guard: a defaultless read in `hasHiddenSpaces` is
      // ABSORBED here by rung (b) — a pre-025 callout has no `selectedIds`
      // either, so the CUSTOM path short-circuits to `false` anyway. The flag
      // side of the rung is pinned by the AUTO-with-inert-`selectedIds` case
      // above, which is the only shape where the divergence is harmful.
      communityResolver.getSpaceWithSubspacesFromCollaborationCallout.mockResolvedValue(
        hostSpaceWithSubs()
      );

      const callout = {
        id: 'callout-1',
        framing: { id: 'framing-1', type: CalloutFramingType.SPACES },
        settings: { framing: {} },
      } as unknown as ICallout;

      expect(
        (await service.getSubspaces(callout, actorContext)).map(s => s.id)
      ).toEqual(['c', 'b', 'a']);
      expect(await service.hasHiddenSpaces(callout, actorContext)).toBe(false);
      expect(accountScopedSpaceQuery).not.toHaveBeenCalled();
    });
  });
});
