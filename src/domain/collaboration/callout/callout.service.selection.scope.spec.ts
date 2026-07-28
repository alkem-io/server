import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { ValidationException } from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Space } from '@domain/space/space/space.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Callout } from './callout.entity';
import { CalloutService } from './callout.service';

/**
 * Tests for the private scope guard (validateSelectionScopeGuard + helpers)
 * via the public createCallout and updateCallout surfaces.
 *
 * Mitigates R-2 (repos.yaml) — AC3 server-authoritative write-time guard.
 * Contract: S7 write-side (graphql-selection-settings.md).
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
  };

  const mockContributionDefaultsService = {
    createCalloutContributionDefaults: vi.fn(),
    updateCalloutContributionDefaults: vi.fn(),
  };

  const mockClassificationService = {
    createClassification: vi.fn().mockReturnValue({ id: 'cls-1' }),
    updateClassification: vi.fn(),
  };

  // Subspace with id helper
  const subspace = (id: string) => ({ id });

  // Host space with community + roleSet + subspaces
  const hostSpaceWithSubspaces = (subspaceIds: string[]) => ({
    id: 'host-space-1',
    community: {
      roleSet: { id: 'rs-1' },
    },
    subspaces: subspaceIds.map(subspace),
  });

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

    // Attach a `manager` mock to the repository so validateSelectionScopeGuard
    // can call manager.findOne(Space, ...) and manager.createQueryBuilder().
    // The repositoryMockFactory only creates method mocks from Repository.prototype;
    // `manager` is a property (EntityManager instance), so it needs to be wired here.
    const { getRepositoryToken } = await import('@nestjs/typeorm');
    const calloutRepo = module.get<any>(getRepositoryToken(Callout));
    calloutRepo.manager = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue(undefined),
      }),
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
          'user-1',
          'host-space-1'
        )
      ).resolves.toBeDefined();
    });
  });

  describe('SPACES scope guard', () => {
    it('accepts an in-scope direct subspace id', async () => {
      const directSubspaceId = 'sub-1';
      mockManagerFindOne(hostSpaceWithSubspaces([directSubspaceId, 'sub-2']));

      mockFramingService.createCalloutFraming.mockResolvedValue({
        id: 'framing-2',
        type: CalloutFramingType.SPACES,
        profile: { storageBucket: { id: 'sb-2' } },
      });

      await expect(
        service.createCallout(
          makeSpacesCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: [directSubspaceId],
          }),
          [],
          { id: 'agg-1' } as any,
          'user-1',
          'host-space-1'
        )
      ).resolves.toBeDefined();
    });

    it('rejects a foreign subspace id (not a direct subspace)', async () => {
      mockManagerFindOne(hostSpaceWithSubspaces(['sub-1', 'sub-2']));

      mockFramingService.createCalloutFraming.mockResolvedValue({
        id: 'framing-3',
        type: CalloutFramingType.SPACES,
        profile: { storageBucket: { id: 'sb-3' } },
      });

      await expect(
        service.createCallout(
          makeSpacesCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: ['foreign-space-from-another-host'],
          }),
          [],
          { id: 'agg-1' } as any,
          'user-1',
          'host-space-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('rejects a non-empty CUSTOM spaces selection without a host space', async () => {
      mockFramingService.createCalloutFraming.mockResolvedValue({
        id: 'framing-4',
        type: CalloutFramingType.SPACES,
        profile: { storageBucket: { id: 'sb-4' } },
      });

      await expect(
        service.createCallout(
          makeSpacesCalloutInput({
            mode: CalloutSelectionMode.CUSTOM,
            selectedIds: ['some-subspace-id'],
          }),
          [],
          { id: 'agg-1' } as any,
          'user-1',
          undefined
        )
      ).rejects.toThrow(ValidationException);
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
        service.createCallout(input, [], { id: 'agg-1' } as any, 'user-1')
      ).resolves.toBeDefined();

      expect(roleSetService.getUsersWithRole).not.toHaveBeenCalled();
    });
  });
});
