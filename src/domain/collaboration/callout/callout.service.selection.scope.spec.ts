import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ACCOUNT_SCOPED_SPACE_ALIAS } from '@domain/space/space/account.scope';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Callout } from './callout.entity';
import { CalloutService } from './callout.service';

/**
 * Tests for the private scope guard (validateAndNormalizeSelectionScope +
 * helpers) via the public createCallout and updateCallout surfaces.
 *
 * Mitigates R-2 (repos.yaml) — AC3 server-authoritative write-time guard.
 * Contract: S7 write-side (graphql-selection-settings.md).
 *
 * workspace#084 widens the SPACES branch from "a direct subspace of the host"
 * to "any space of the host space's account", and splits the decision in two:
 * a NEWLY ADDED out-of-account id is rejected, a CARRIED-OVER one that has
 * left the account is dropped silently.
 *
 * WHAT A MOCKED REPOSITORY CAN AND CANNOT PROVE. The account membership of a
 * row is fed to these cases by `inAccount(...)`, so they prove the BRANCH —
 * reject vs drop vs accept, and which list the diff is taken from — and not
 * the SQL. The set semantics of the join are proven against real Postgres by
 * the `test-suites` it-spec (wave 4); see `account.scope.spec.ts` for why
 * asserting them here would be theatre.
 */
describe('CalloutService — selection scope guard (T008)', () => {
  let service: CalloutService;
  let roleSetService: RoleSetService;
  let module: TestingModule;

  // Minimal CalloutFramingService stubs: just enough for createCallout flow.
  const mockFramingService = {
    createCalloutFraming: vi.fn(),
    validateAndNormalizeContributorsSettings: vi.fn((_, s) => s),
    validateAndNormalizeSelectionSettings: vi.fn((_, s, inc) => {
      // Simulate the real normalizer: materialize {AUTO, []} if absent.
      if (!s.selection) {
        s.selection = {
          mode: CalloutSelectionMode.AUTO,
          selectedIds: [],
        };
      }
      if (inc !== undefined) {
        if (inc.mode !== undefined) s.selection.mode = inc.mode;
        if (inc.selectedIds !== undefined)
          s.selection.selectedIds = inc.selectedIds;
      }
      return s;
    }),
    // Pass-through stub: this suite exercises the selection scope guard, not
    // the card-variant normalizer — leave the settings object otherwise
    // untouched.
    validateAndNormalizeSpacesSettings: vi.fn((_, s) => s),
    // No-op: the up-front off-kind block check is covered with the real
    // implementation in callout.service.spaces.settings.spec.ts.
    validateSettingsBlocksForFramingType: vi.fn(),
  };

  const mockContributionDefaultsService = {
    createCalloutContributionDefaults: vi.fn(),
    updateCalloutContributionDefaults: vi.fn(),
  };

  const mockClassificationService = {
    createClassification: vi.fn().mockReturnValue({ id: 'cls-1' }),
    updateClassification: vi.fn(),
  };

  // The rows the shared account-scope predicate comes back with, per case.
  let accountScopeRows: { id: string }[] = [];
  let accountScopeBuilder: Record<string, ReturnType<typeof vi.fn>>;
  let createQueryBuilderMock: ReturnType<typeof vi.fn>;
  // What `getParentSpaceId` resolves the host space to on the update path.
  let parentSpaceRow: { spaceId: string } | undefined;

  /** Declare which of the submitted ids belong to the host space's account. */
  const inAccount = (ids: string[]) => {
    accountScopeRows = ids.map(id => ({ id }));
  };

  const hostSpaceWithCommunity = () => ({
    id: 'host-space-1',
    community: {
      roleSet: { id: 'rs-1' },
    },
    subspaces: [],
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    vi.spyOn(Callout, 'create').mockImplementation((input: any) => {
      const entity = new Callout();
      Object.assign(entity, input);
      return entity as any;
    });

    module = await Test.createTestingModule({
      providers: [
        CalloutService,
        repositoryProviderMockFactory(Callout),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: RoleSetService,
          useValue: {
            getUsersWithRole: vi.fn().mockResolvedValue([]),
            getOrganizationsWithRole: vi.fn().mockResolvedValue([]),
            getVirtualContributorsWithRole: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    })
      .useMocker(token => {
        // Use real framing-service stubs for the methods we control.
        if (
          typeof token === 'function' &&
          token.name === 'CalloutFramingService'
        ) {
          return mockFramingService;
        }
        if (
          typeof token === 'function' &&
          token.name === 'CalloutContributionDefaultsService'
        ) {
          return mockContributionDefaultsService;
        }
        if (
          typeof token === 'function' &&
          token.name === 'ClassificationService'
        ) {
          return mockClassificationService;
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(CalloutService);
    roleSetService = module.get(RoleSetService);

    // Attach a `manager` mock to the repository so validateAndNormalizeSelectionScope
    // can call manager.findOne(Space, ...) and manager.createQueryBuilder().
    // The repositoryMockFactory only creates method mocks from Repository.prototype;
    // `manager` is a property (EntityManager instance), so it needs to be wired here.
    const { getRepositoryToken } = await import('@nestjs/typeorm');
    const calloutRepo = module.get<any>(getRepositoryToken(Callout));

    accountScopeRows = [];
    parentSpaceRow = undefined;

    // The account-scope predicate's builder: `createQueryBuilder(Space, alias)`.
    accountScopeBuilder = {
      innerJoin: vi.fn(() => accountScopeBuilder),
      where: vi.fn(() => accountScopeBuilder),
      andWhere: vi.fn(() => accountScopeBuilder),
      select: vi.fn(() => accountScopeBuilder),
      getRawMany: vi.fn(async () => accountScopeRows),
    } as any;

    // `getParentSpaceId`'s builder: `createQueryBuilder()`, no entity.
    const parentSpaceBuilder: any = {
      select: vi.fn(() => parentSpaceBuilder),
      from: vi.fn(() => parentSpaceBuilder),
      innerJoin: vi.fn(() => parentSpaceBuilder),
      where: vi.fn(() => parentSpaceBuilder),
      getRawOne: vi.fn(async () => parentSpaceRow),
    };

    createQueryBuilderMock = vi.fn((entity?: unknown) =>
      entity ? accountScopeBuilder : parentSpaceBuilder
    );
    calloutRepo.manager = {
      findOne: vi.fn(),
      createQueryBuilder: createQueryBuilderMock,
    };

    // Set up defaults for the framing service mocks
    mockFramingService.createCalloutFraming.mockResolvedValue({
      id: 'framing-1',
      type: CalloutFramingType.CONTRIBUTORS,
      profile: { storageBucket: { id: 'sb-1' } },
    });
    mockContributionDefaultsService.createCalloutContributionDefaults.mockReturnValue(
      { id: 'defaults-1' }
    );
  });

  /**
   * Wire the repository mock's `manager.findOne` to return different values
   * based on the entity class queried.
   *
   * The `manager` is attached in `beforeEach`; here we configure what
   * `findOne` returns for this test's host-space fixture.
   */
  function mockManagerFindOne(space: any) {
    const { getRepositoryToken } = require('@nestjs/typeorm');
    const calloutRepo = module.get<any>(getRepositoryToken(Callout));
    vi.mocked(calloutRepo.manager.findOne).mockImplementation(
      async (entity: any) => {
        if (entity === Space) return space;
        return null;
      }
    );
  }

  function makeContributorsCalloutInput(selection: {
    mode: CalloutSelectionMode;
    selectedIds: string[];
  }) {
    return {
      nameID: 'test-callout',
      framing: {
        type: CalloutFramingType.CONTRIBUTORS,
        profile: { displayName: 'Test', tagsets: [] },
        tags: [],
      },
      settings: {
        framing: { selection },
        contribution: { allowedTypes: [] },
      },
      contributions: [],
      classification: {},
    } as any;
  }

  function makeSpacesCalloutInput(selection: {
    mode: CalloutSelectionMode;
    selectedIds: string[];
  }) {
    return {
      nameID: 'test-spaces-callout',
      framing: {
        type: CalloutFramingType.SPACES,
        profile: { displayName: 'Test', tagsets: [] },
        tags: [],
      },
      settings: {
        framing: { selection },
        contribution: { allowedTypes: [] },
      },
      contributions: [],
      classification: {},
    } as any;
  }

  describe('CONTRIBUTORS scope guard', () => {
    it('accepts an in-scope contributor id (member of host RoleSet)', async () => {
      const eligibleId = 'user-eligible-1';
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([
        { id: eligibleId } as any,
      ]);
      mockManagerFindOne(hostSpaceWithCommunity());

      // Should NOT throw
      await expect(
        service.createCallout(
          makeContributorsCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: [eligibleId],
          }),
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1',
          'host-space-1'
        )
      ).resolves.toBeDefined();
    });

    it('rejects a foreign-space contributor id not in host RoleSet', async () => {
      // All role lookups return empty → the foreign id is not eligible
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
      vi.mocked(roleSetService.getOrganizationsWithRole).mockResolvedValue([]);
      vi.mocked(
        roleSetService.getVirtualContributorsWithRole
      ).mockResolvedValue([]);
      mockManagerFindOne(hostSpaceWithCommunity());

      await expect(
        service.createCallout(
          makeContributorsCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: ['foreign-space-user-id'],
          }),
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1',
          'host-space-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('accepts an empty selection regardless of membership (FR-003)', async () => {
      mockManagerFindOne(hostSpaceWithCommunity());

      // Empty CUSTOM selection: no scope check needed
      await expect(
        service.createCallout(
          makeContributorsCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: [],
          }),
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1',
          'host-space-1'
        )
      ).resolves.toBeDefined();
    });

    it('rejects a non-empty CUSTOM selection when there is no host space (template context)', async () => {
      await expect(
        service.createCallout(
          makeContributorsCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: ['some-id'],
          }),
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1',
          undefined // no parentSpaceId → template/KB context
        )
      ).rejects.toThrow(ValidationException);
    });

    it('accepts AUTO mode even with non-empty ids (guard skips AUTO)', async () => {
      mockManagerFindOne(hostSpaceWithCommunity());

      await expect(
        service.createCallout(
          makeContributorsCalloutInput({
            mode: CalloutSelectionMode.AUTO,
            selectedIds: ['any-id'],
          }),
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1',
          'host-space-1'
        )
      ).resolves.toBeDefined();
    });
  });

  /** Create a SPACES callout with the given CUSTOM/AUTO selection. */
  // `hostSpaceId: null` is the template/knowledge-base context (no host space);
  // it is spelled `null` rather than `undefined` so it cannot be swallowed by
  // the default parameter.
  const createSpacesCallout = (
    selectedIds: string[],
    hostSpaceId: string | null = 'host-space-1',
    mode: CalloutSelectionMode = CalloutSelectionMode.CUSTOM
  ) => {
    mockFramingService.createCalloutFraming.mockResolvedValue({
      id: 'framing-spaces',
      type: CalloutFramingType.SPACES,
      profile: { storageBucket: { id: 'sb-spaces' } },
    });
    return service.createCallout(
      makeSpacesCalloutInput({ mode, selectedIds }),
      [],
      { id: 'agg-1' } as any,
      actorContextData.actorContext,
      'user-1',
      hostSpaceId ?? undefined
    );
  };

  describe('SPACES scope guard — the account boundary (workspace#084)', () => {
    // The ids below carry their topology in their names only; what makes each
    // one in- or out-of-account is `inAccount(...)`. See the suite header.
    it('accepts an L0 SIBLING of the host level-zero space in the same account', async () => {
      inAccount(['sibling-l0']);
      await expect(createSpacesCallout(['sibling-l0'])).resolves.toBeDefined();
    });

    it('accepts an L2 under a DIFFERENT L0 of the same account', async () => {
      inAccount(['other-tree-l2']);
      await expect(
        createSpacesCallout(['other-tree-l2'])
      ).resolves.toBeDefined();
    });

    it("accepts an L2 under the host's own tree (not a direct subspace)", async () => {
      inAccount(['host-tree-l2']);
      await expect(
        createSpacesCallout(['host-tree-l2'])
      ).resolves.toBeDefined();
    });

    it("accepts the host space's own id (NR-1: no guard against self-selection)", async () => {
      // Asserted so a later "hardening" that rejects the host space fails this
      // case and has to argue with the spec, rather than shipping green.
      inAccount(['host-space-1']);
      await expect(
        createSpacesCallout(['host-space-1'])
      ).resolves.toBeDefined();
    });

    it('rejects a NEWLY ADDED id in a different account, naming only the offender', async () => {
      inAccount([]);
      await expect(
        createSpacesCallout(['foreign-account-space'])
      ).rejects.toThrow(ValidationException);
    });

    it('rejects a NEWLY ADDED non-existent id', async () => {
      // A non-existent id simply does not come back from the predicate, so it
      // is indistinguishable from an out-of-account one — and both reject.
      inAccount([]);
      await expect(createSpacesCallout(['no-such-space'])).rejects.toThrow(
        ValidationException
      );
    });

    it('rejects a non-empty CUSTOM spaces selection without a host space', async () => {
      await expect(
        createSpacesCallout(['some-space-id'], null)
      ).rejects.toThrow(ValidationException);
      expect(accountScopeBuilder.getRawMany).not.toHaveBeenCalled();
    });

    it('checks the whole submitted list in ONE round trip, through the shared predicate', async () => {
      inAccount(['a', 'b', 'c']);
      await expect(createSpacesCallout(['a', 'b', 'c'])).resolves.toBeDefined();

      // ONE statement, ONE terminal call: RED against a per-id loop and
      // against the two-step host-account lookup this replaced.
      expect(createQueryBuilderMock).toHaveBeenCalledTimes(1);
      expect(accountScopeBuilder.getRawMany).toHaveBeenCalledTimes(1);

      // ...and it is the SHARED predicate's statement, not a locally
      // hand-rolled join: the shared alias, one join, and the account resolved
      // through `levelZeroSpaceID` (FR-004a). A second copy that filtered
      // `space."accountId"` directly would be wrong for every L1/L2.
      expect(createQueryBuilderMock).toHaveBeenCalledWith(
        Space,
        ACCOUNT_SCOPED_SPACE_ALIAS
      );
      expect(accountScopeBuilder.innerJoin).toHaveBeenCalledTimes(1);
      expect(String(accountScopeBuilder.innerJoin.mock.calls[0][2])).toContain(
        'levelZeroSpaceID'
      );
      // The whole submitted list goes into that one statement.
      expect(accountScopeBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(`${ACCOUNT_SCOPED_SPACE_ALIAS}.id IN`),
        { accountScopeCandidateIds: ['a', 'b', 'c'] }
      );
    });

    it('AUTO mode skips the account check even with non-empty ids', async () => {
      await expect(
        createSpacesCallout(
          ['anything'],
          'host-space-1',
          CalloutSelectionMode.AUTO
        )
      ).resolves.toBeDefined();
      expect(accountScopeBuilder.getRawMany).not.toHaveBeenCalled();
    });

    it('an empty CUSTOM selection skips the account check entirely', async () => {
      await expect(createSpacesCallout([])).resolves.toBeDefined();
      expect(accountScopeBuilder.getRawMany).not.toHaveBeenCalled();
    });
  });

  /**
   * THE UPDATE PATH (ruling D3).
   *
   * Before workspace#084 this suite's header claimed to exercise the guard
   * "via the public createCallout and updateCallout surfaces" while EVERY case
   * called `createCallout`. The update half therefore had no coverage, and the
   * guard's snapshot point could be got wrong without a single red test.
   *
   * The matched pair below is what makes a wrong capture point fail: snapshot
   * AFTER `mergeCalloutSettings` and `added` is empty, so the reject case
   * passes silently; treat every submitted id as added and the drop case
   * throws. A unit test against the scope predicate alone CANNOT make either
   * assertion — the predicate is handed the ids and never sees the merge, so
   * it cannot observe which list the caller took them from. Do not
   * "simplify" these back to a predicate-only test.
   */
  describe('SPACES scope guard — the update path (ruling D3)', () => {
    /**
     * Drive the public `updateCallout` surface over a stored callout and
     * return the settings as handed to the save.
     */
    const updateStoredCallout = async (
      framingType: CalloutFramingType,
      stored: { mode: CalloutSelectionMode; selectedIds: string[] },
      submitted: { mode?: CalloutSelectionMode; selectedIds?: string[] }
    ) => {
      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));

      const storedCallout: any = {
        id: 'callout-1',
        nameID: 'stored-callout',
        framing: { id: 'framing-1', type: framingType, profile: {} },
        contributionDefaults: { id: 'defaults-1' },
        classification: { id: 'cls-1', tagsets: [] },
        calloutsSet: { id: 'cs-1' },
        comments: { id: 'room-1' },
        settings: {
          contribution: { allowedTypes: [] },
          framing: { commentsEnabled: false, selection: { ...stored } },
          visibility: CalloutVisibility.DRAFT,
        },
      };

      vi.mocked(calloutRepo.findOne).mockResolvedValue(storedCallout);
      vi.mocked(calloutRepo.save).mockImplementation(async (c: any) => c);
      parentSpaceRow = { spaceId: 'host-space-1' };

      const saved = await service.updateCallout(
        { id: 'callout-1' } as any,
        {
          ID: 'callout-1',
          settings: { framing: { selection: submitted } },
        } as any,
        actorContextData.actorContext,
        'user-1'
      );
      return (saved as any).settings.framing.selection;
    };

    it('REJECTS a newly added out-of-account id and persists nothing', async () => {
      inAccount(['kept-1']);

      await expect(
        updateStoredCallout(
          CalloutFramingType.SPACES,
          { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['kept-1'] },
          {
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: ['kept-1', 'foreign-account-space'],
          }
        )
      ).rejects.toThrow(ValidationException);

      const { getRepositoryToken } = await import('@nestjs/typeorm');
      const calloutRepo = module.get<any>(getRepositoryToken(Callout));
      expect(calloutRepo.save).not.toHaveBeenCalled();
    });

    it('DROPS a carried-over id that has left the account, and succeeds', async () => {
      // `departed-1` is in the stored list and no longer in the account.
      inAccount(['kept-1']);

      const selection = await updateStoredCallout(
        CalloutFramingType.SPACES,
        {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['kept-1', 'departed-1'],
        },
        {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['kept-1', 'departed-1'],
        }
      );

      expect(selection.selectedIds).toEqual(['kept-1']);
    });

    /**
     * FR-003c, preservation case 1. The shape the client actually sends on a
     * CUSTOM→AUTO toggle is `selection: { mode: AUTO, selectedIds: [a, b] }`.
     * RED against any design in which a call site assigns a kept list back
     * unconditionally: the guard returns before the SPACES branch on AUTO, so
     * such a call site writes `undefined`/`[]` and 025's non-destructive
     * toggle (FR-007) is lost irrecoverably — the client re-reads the stored
     * value after the refetch.
     */
    it('preserves the curated list on a CUSTOM→AUTO toggle', async () => {
      inAccount([]);

      const selection = await updateStoredCallout(
        CalloutFramingType.SPACES,
        { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['a', 'b'] },
        { mode: CalloutSelectionMode.AUTO, selectedIds: ['a', 'b'] }
      );

      expect(selection.mode).toBe(CalloutSelectionMode.AUTO);
      expect(selection.selectedIds).toEqual(['a', 'b']);
      expect(accountScopeBuilder.getRawMany).not.toHaveBeenCalled();
    });

    /**
     * FR-003c, preservation case 2. The one case in this suite that guards the
     * branch workspace#084 promises not to touch: a CONTRIBUTORS callout in
     * CUSTOM mode keeps its selection across an ordinary update, and the
     * SPACES account predicate is never consulted for contributor ids.
     */
    it('leaves a CONTRIBUTORS CUSTOM selection untouched', async () => {
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([
        { id: 'member-1' } as any,
      ]);
      mockManagerFindOne(hostSpaceWithCommunity());

      const selection = await updateStoredCallout(
        CalloutFramingType.CONTRIBUTORS,
        { mode: CalloutSelectionMode.CUSTOM, selectedIds: ['member-1'] },
        { selectedIds: ['member-1'] }
      );

      expect(selection.selectedIds).toEqual(['member-1']);
      expect(accountScopeBuilder.getRawMany).not.toHaveBeenCalled();
    });
  });

  describe('mode / empty list bypasses', () => {
    it('AUTO mode skips the scope guard entirely (no DB calls for validation)', async () => {
      // Using NONE framing type (non-collection), AUTO, no parentSpaceId:
      // the normalizer will strip any selection; guard is never invoked.
      mockFramingService.createCalloutFraming.mockResolvedValue({
        id: 'framing-5',
        type: CalloutFramingType.NONE,
        profile: { storageBucket: { id: 'sb-5' } },
      });

      const input = {
        nameID: 'test',
        framing: {
          type: CalloutFramingType.NONE,
          profile: { displayName: 'Test', tagsets: [] },
          tags: [],
        },
        settings: {
          framing: { selection: undefined },
          contribution: { allowedTypes: [] },
        },
        contributions: [],
        classification: {},
      } as any;

      await expect(
        service.createCallout(
          input,
          [],
          { id: 'agg-1' } as any,
          actorContextData.actorContext,
          'user-1'
        )
      ).resolves.toBeDefined();

      expect(roleSetService.getUsersWithRole).not.toHaveBeenCalled();
    });
  });
});
