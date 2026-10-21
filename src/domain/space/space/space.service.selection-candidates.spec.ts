import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthorizationPrivilege } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { ACCOUNT_SCOPED_SPACE_ALIAS } from './account.scope';
import { Space } from './space.entity';
import { SpaceService } from './space.service';

/**
 * `SpaceService.getAccountSelectionCandidates` — the Spaces-callout selection
 * picker's data path (workspace#084 T008/T009/T010; FR-008, FR-010..FR-013,
 * FR-009, AC1-AC3).
 *
 * BE HONEST ABOUT WHAT THIS SPEC CAN PROVE. `vitest` runs `environment:
 * 'node'` with hand-wired repository mocks and NO database
 * (`vitest.config.ts`): `createQueryBuilder` is a mock and `getMany` returns
 * whatever the test fed it. "A space of ANOTHER account is never returned" is
 * therefore NOT assertable here — a fixture that contains no foreign space and
 * an assertion that none comes out restates the fixture and passes identically
 * against a predicate that filtered `space."accountId"` directly, which is the
 * exact defect FR-004a exists to prevent. The honest unit-level form of that
 * claim is 'the method applies no account test of its own and delegates wholly
 * to the single shared predicate' — asserted below — and the SQL set semantics
 * are proven against real Postgres by the wave-4 `test-suites` it-spec
 * (`tasks/test-suites.md` T201-T203). Do not "strengthen" this spec with
 * set-semantics assertions; they would be theatre.
 *
 * What a mock CAN honestly carry is everything in THIS method that is not the
 * join: the statement's shape and round-trip count, the column restriction and
 * the order it is applied in, the per-viewer privilege filter, and the
 * row-to-DTO mapping.
 */
describe('SpaceService.getAccountSelectionCandidates (T008)', () => {
  const HOST_ID = 'l0-a';

  /** Order-recording chainable query-builder mock. */
  const makeBuilder = (rows: Space[]) => {
    const calls: string[] = [];
    const builder: Record<string, any> = { calls };
    for (const name of [
      'select',
      'addSelect',
      'innerJoin',
      'innerJoinAndSelect',
      'leftJoin',
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'limit',
    ]) {
      builder[name] = vi.fn(() => {
        calls.push(name);
        return builder;
      });
    }
    builder.getMany = vi.fn(async () => rows);
    return builder;
  };

  /**
   * One account, TWO level-zero roots, every level represented:
   *   l0-a (the host) → l1-a → l2-a
   *   l0-b (an in-account sibling L0) → l1-b
   *
   * `l0-b`/`l1-b` are what AC1 is about: a CUSTOM selection may name a space
   * under a DIFFERENT level-zero root of the same account, so the candidate
   * list must carry them. They are ordinary rows here — the thing that puts
   * them in the result set is the shared SQL predicate, not this method.
   */
  const makeRow = (
    id: string,
    level: SpaceLevel,
    parentSpaceID: string | undefined,
    aboutDisplayName: string
  ): Space =>
    ({
      id,
      level,
      authorization: { id: `auth-${id}` },
      parentSpace: parentSpaceID ? { id: parentSpaceID } : undefined,
      about: { id: `about-${id}`, profile: { displayName: aboutDisplayName } },
    }) as unknown as Space;

  const defaultRows = (): Space[] => [
    makeRow(HOST_ID, SpaceLevel.L0, undefined, 'Green Cities'),
    makeRow('l1-a', SpaceLevel.L1, HOST_ID, 'Team'),
    makeRow('l2-a', SpaceLevel.L2, 'l1-a', 'Sprint'),
    makeRow('l0-b', SpaceLevel.L0, undefined, 'Blue Water'),
    makeRow('l1-b', SpaceLevel.L1, 'l0-b', 'Delta'),
  ];

  let service: SpaceService;
  let spaceRepository: Repository<Space>;
  let authorizationService: AuthorizationService;
  let builder: ReturnType<typeof makeBuilder>;
  let createQueryBuilder: ReturnType<typeof vi.fn>;

  const actorContext = { credentials: [] } as unknown as ActorContext;

  const withRows = async (rows: Space[]) => {
    builder = makeBuilder(rows);
    createQueryBuilder = vi.fn(() => builder);
    (spaceRepository as any).manager = { createQueryBuilder };
    return service.getAccountSelectionCandidates(
      { id: HOST_ID } as any,
      actorContext
    );
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Space),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SpaceService>(SpaceService);
    spaceRepository = module.get<Repository<Space>>(getRepositoryToken(Space));
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    (authorizationService.isAccessGranted as any).mockReturnValue(true);
  });

  describe('the account boundary', () => {
    it('delegates it WHOLLY to the single shared predicate — ONE statement, keyed on the host space, with NO id filter', async () => {
      await withRows(defaultRows());

      // ONE round trip for the whole pool, regardless of how many levels or
      // level-zero roots the account has: the FR-011 guard against a per-level
      // fan-out and a per-candidate authorization query, and the FR-004a guard
      // against a second statement to resolve the host's account.
      expect(createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(createQueryBuilder).toHaveBeenCalledWith(
        Space,
        ACCOUNT_SCOPED_SPACE_ALIAS
      );
      expect(builder.getMany).toHaveBeenCalledTimes(1);

      // Routed through `accountScopedSpaceQuery`, identified by the statement
      // only it produces: the host's account resolved in the SAME statement as
      // a correlated subquery, through `levelZeroSpaceID` and never off the
      // candidate row (`space.accountId` is meaningfully populated on
      // level-zero rows only).
      const where = String(builder.where.mock.calls[0][0]);
      expect(where).toContain('levelZeroSpaceID');
      expect(where).toContain('SELECT');
      expect(builder.where.mock.calls[0][1]).toEqual({
        accountScopeHostSpaceId: HOST_ID,
      });

      // The candidate pool is the WHOLE account, so the predicate's id filter
      // must be absent. Passing `[]` here would be the same bug from the other
      // side: its absent form means the whole account.
      expect(builder.andWhere).not.toHaveBeenCalled();

      // And nothing in this method re-tests the account in memory: every row
      // the predicate returned and the viewer can READ is a candidate.
      expect(builder.limit).toHaveBeenCalledWith(500);
    });
  });

  describe('the statement this method adds to the predicate', () => {
    /**
     * The discriminating assertion for the COMP-084-R5-06 failure FAMILY in
     * THIS chunk. The finding itself — a column-restricted select nullifying
     * the non-null `[ISpace!]!` CUSTOM collection — is asserted at its two
     * owners (`account.scope.spec.ts`, which proves the shared helper
     * restricts nothing, and the read path's own spec, which proves its
     * consumer does not either). A restricted select is CORRECT here, because
     * this method returns a scalar DTO; the same failure arrives by a
     * different route instead.
     *
     * TypeORM's `select()` REPLACES the selection list. Move it after the
     * authorization join — the natural edit, and the one a reader who thinks
     * of `select` as "the columns" will make — and that join's selection is
     * silently dropped: `space.authorization` comes back `undefined` and
     * `isAccessGranted` THROWS for the first candidate, so the picker fails
     * closed for the very admin who opened it. Nothing but a real database
     * sees it otherwise, exactly as in COMP-084-R5-06, because every spec in
     * this repo mocks `createQueryBuilder`.
     */
    it('applies its column restriction BEFORE any join-select or addSelect', async () => {
      await withRows(defaultRows());

      expect(builder.select).toHaveBeenCalledTimes(1);
      const selectIndex = builder.calls.indexOf('select');
      const firstSelectingJoin = builder.calls.findIndex(
        (call: string) => call === 'innerJoinAndSelect' || call === 'addSelect'
      );
      expect(selectIndex).toBeGreaterThanOrEqual(0);
      expect(selectIndex).toBeLessThan(firstSelectingJoin);
    });

    it('does NOT select `visibility` — its only reader was the deleted visibility exclusion', async () => {
      await withRows(defaultRows());

      // Spec revision 3 deleted FR-010a: an ARCHIVED space skips
      // `extendAuthorizationPolicyLocal` entirely, so it carries no member,
      // admin or privacy rule and the READ filter below already denies it.
      // Nothing in this method may read visibility again (A19, NR-8).
      const selected = builder.select.mock.calls[0][0] as string[];
      expect(selected).toEqual([
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.id`,
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.level`,
      ]);
      expect(selected.join(',')).not.toContain('visibility');
      expect(builder.addSelect.mock.calls.flat(2).join(',')).not.toContain(
        'visibility'
      );
    });

    it('loads the authorization policy as an INNER join-select — a policy-less row is dropped in SQL, not guarded in code', async () => {
      await withRows(defaultRows());

      expect(builder.innerJoinAndSelect).toHaveBeenCalledWith(
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.authorization`,
        'authorization'
      );
      // `isAccessGranted` throws on an undefined policy and a LEFT join yields
      // null for a row whose `authorizationId` is null — reachable, that FK is
      // ON DELETE SET NULL. Dropping the row in SQL is shrink-only.
      expect(builder.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('takes `displayName` from the ABOUT profile, never the actor-level profile', async () => {
      // A Space carries TWO profiles. The actor-level `space.profile` is set
      // once at creation from the About display name and is NEVER re-synced on
      // rename, so the shorter join — which typechecks and returns a non-null
      // string — offers every space renamed since creation under its OLD name
      // while the card the admin then publishes renders the current one. This
      // is the only assertion anywhere that distinguishes the two joins.
      const renamed = makeRow(HOST_ID, SpaceLevel.L0, undefined, 'Renamed');
      (renamed as any).profile = { displayName: 'Original' };

      const result = await withRows([renamed]);

      expect(result[0].displayName).toBe('Renamed');
      expect(builder.innerJoin).toHaveBeenCalledWith(
        `${ACCOUNT_SCOPED_SPACE_ALIAS}.about`,
        'about'
      );
      expect(builder.innerJoin).toHaveBeenCalledWith(
        'about.profile',
        'aboutProfile'
      );
      expect(builder.addSelect.mock.calls.flat(2)).toContain(
        'aboutProfile.displayName'
      );
      // The actor-level profile is never joined — the mistake is unreachable
      // rather than merely unasserted.
      const joined = [
        ...builder.innerJoin.mock.calls,
        ...builder.leftJoin.mock.calls,
        ...builder.innerJoinAndSelect.mock.calls,
      ]
        .map(call => String(call[0]))
        .join(',');
      expect(joined).not.toContain(`${ACCOUNT_SCOPED_SPACE_ALIAS}.profile`);
    });
  });

  describe('the per-viewer READ filter (AC2, ruling D1)', () => {
    it('tests READ, not READ_ABOUT, on every candidate', async () => {
      await withRows(defaultRows());

      // The case that fails if the privilege is ever "restored" to
      // READ_ABOUT. For a level-zero space READ_ABOUT is pushed
      // unconditionally for anonymous, guest and registered actors, so a
      // READ_ABOUT filter would offer the account's whole L0 set — PRIVATE
      // siblings included — to anyone holding READ on ONE space of it.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(5);
      for (const call of (authorizationService.isAccessGranted as any).mock
        .calls) {
        expect(call[2]).toBe(AuthorizationPrivilege.READ);
      }
    });

    it('omits a space the actor cannot READ, including a PRIVATE in-account sibling L0 it can only READ_ABOUT', async () => {
      (authorizationService.isAccessGranted as any).mockImplementation(
        (_actor: unknown, policy: { id: string }) =>
          policy.id !== 'auth-l0-b' && policy.id !== 'auth-l1-b'
      );

      const result = await withRows(defaultRows());

      expect(result.map(candidate => candidate.id)).toEqual([
        HOST_ID,
        'l1-a',
        'l2-a',
      ]);
    });

    it('returns an empty list when the actor can read nothing — never an error', async () => {
      (authorizationService.isAccessGranted as any).mockReturnValue(false);

      expect(await withRows(defaultRows())).toEqual([]);
    });
  });

  describe('the row-to-DTO mapping', () => {
    it('carries every level, across every level-zero root of the account', async () => {
      const result = await withRows(defaultRows());

      // No level filter, no per-host-level branch and no host-subtree
      // restriction is applied after the query: a selection may name a space
      // under a DIFFERENT L0 of the same account (AC1), so `l0-b`/`l1-b` must
      // survive. An implementation that narrowed the pool to the host's own
      // subtree would fail here.
      expect(
        result.map(candidate => ({
          id: candidate.id,
          level: candidate.level,
          parentSpaceID: candidate.parentSpaceID,
          displayName: candidate.displayName,
        }))
      ).toEqual([
        {
          id: HOST_ID,
          level: SpaceLevel.L0,
          parentSpaceID: undefined,
          displayName: 'Green Cities',
        },
        {
          id: 'l1-a',
          level: SpaceLevel.L1,
          parentSpaceID: HOST_ID,
          displayName: 'Team',
        },
        {
          id: 'l2-a',
          level: SpaceLevel.L2,
          parentSpaceID: 'l1-a',
          displayName: 'Sprint',
        },
        {
          id: 'l0-b',
          level: SpaceLevel.L0,
          parentSpaceID: undefined,
          displayName: 'Blue Water',
        },
        {
          id: 'l1-b',
          level: SpaceLevel.L1,
          parentSpaceID: 'l0-b',
          displayName: 'Delta',
        },
      ]);
    });

    it('includes the HOST space itself when readable, so the picker needs no second query (contract S2)', async () => {
      const result = await withRows(defaultRows());

      // The picker renders it as a disabled "the callout is here" row. An
      // in-memory `filter(row => row.id !== space.id)` — a plausible reading
      // of "you cannot select the space you are in", which spec NR-1 forbids
      // adding server-side — would fail here.
      expect(result.map(candidate => candidate.id)).toContain(HOST_ID);
    });

    it('exposes NO field beyond the four the picker needs', async () => {
      const result = await withRows([
        makeRow('l1-a', SpaceLevel.L1, HOST_ID, 'Team'),
      ]);

      // `inHostTree` was deleted in spec revision 6 (the badge is derived on
      // the client from `parentSpaceID`) and no visibility, avatar or settings
      // value was ever part of the contract. Removing a field later is a
      // breaking schema change, so an accidental addition must fail here.
      expect(Object.keys(result[0]).sort()).toEqual([
        'displayName',
        'id',
        'level',
        'parentSpaceID',
      ]);
    });
  });

  it('FR-009/AC3: the `accountSpaces` resolve field is UPDATE-gated', () => {
    // A structural check, not a runtime one. UPDATE is the host-space-admin
    // test the client already computes for the admin-only Spaces framing chip.
    // An implementer who omits the decorator, or who copies the sibling
    // `account` field's READ, keeps every other gate green while exposing the
    // account's readable space list — ids, names, levels, parentage — to any
    // member holding READ on ONE space of the account: precisely the
    // enumeration surface risk R-E says this feature must not widen. No walk
    // requests `accountSpaces` as a non-admin, so this is the only guard.
    //
    // The window starts at the previous blank line, NOT at `@ResolveField` —
    // every sibling field in that file places its privilege decorator ABOVE
    // `@ResolveField`, so a slice starting there would miss one added in the
    // conventional spot and stay green through the exact regression it exists
    // to catch. Same shape as
    // `classification.entry.resolver.fields.spec.ts`, which asserts the
    // deliberate ABSENCE of these decorators the same way.
    const source = readFileSync(
      join(__dirname, 'space.resolver.fields.ts'),
      'utf-8'
    );
    const methodStart = source.indexOf('async accountSpaces(');
    expect(methodStart).toBeGreaterThan(-1);
    const windowStart = source.lastIndexOf('\n\n', methodStart);
    const fieldSource = source.slice(
      windowStart,
      source.indexOf('\n  }\n', methodStart)
    );

    expect(fieldSource).toMatch(
      /^\s*@AuthorizationActorHasPrivilege\(AuthorizationPrivilege\.UPDATE\)/m
    );
    expect(fieldSource).toMatch(/^\s*@UseGuards\(GraphqlGuard\)/m);
    expect(fieldSource).not.toMatch(
      /^\s*@AuthorizationActorHasPrivilege\(AuthorizationPrivilege\.READ\)/m
    );
  });
});
