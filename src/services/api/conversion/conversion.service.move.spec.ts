import { SpaceLevel } from '@common/enums/space.level';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '@platform/activity/activity.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { ConversionService } from './conversion.service';

describe('ConversionService — Cross-L0 Moves', () => {
  let service: ConversionService;
  let spaceService: Record<string, Mock>;
  let roleSetService: Record<string, Mock>;
  let namingService: Record<string, Mock>;
  let entityManager: Record<string, Mock>;
  let spaceLookupService: Record<string, Mock>;
  let calloutsSetService: Record<string, Mock>;
  let activityService: Record<string, Mock>;

  // Reusable mock chain for EntityManager.createQueryBuilder()
  const mockQueryBuilder = () => {
    const qb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereInIds: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    return qb;
  };

  const makeSourceL1 = (overrides: Record<string, unknown> = {}) => ({
    id: 'source-l1',
    level: SpaceLevel.L1,
    levelZeroSpaceID: 'source-l0',
    nameID: 'source-subspace',
    sortOrder: 3,
    community: { roleSet: { id: 'roleset-l1' } },
    storageAggregator: { id: 'sa-l1', parentStorageAggregator: null },
    subspaces: [],
    ...overrides,
  });

  const makeTargetL0 = (overrides: Record<string, unknown> = {}) => ({
    id: 'target-l0',
    level: SpaceLevel.L0,
    levelZeroSpaceID: 'target-l0',
    community: { roleSet: { id: 'roleset-target-l0' } },
    storageAggregator: { id: 'sa-target-l0' },
    subspaces: [{ id: 'existing-child' }],
    account: { id: 'account-target', accountType: 'BASIC' },
    ...overrides,
  });

  const makeTargetL1 = (overrides: Record<string, unknown> = {}) => ({
    id: 'target-l1',
    level: SpaceLevel.L1,
    levelZeroSpaceID: 'target-l0',
    community: { roleSet: { id: 'roleset-target-l1' } },
    storageAggregator: { id: 'sa-target-l1' },
    subspaces: [],
    ...overrides,
  });

  const emptyRoles = () => {
    vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getOrganizationsWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getVirtualContributorsWithRole).mockResolvedValue(
      []
    );
  };

  /** Sets up mocks for the helpers called after validation passes */
  const setupHappyPathMocks = () => {
    emptyRoles();
    vi.mocked(
      namingService.getReservedNameIDsInLevelZeroSpace
    ).mockResolvedValue([]);
    vi.mocked(entityManager.find).mockResolvedValue([
      { id: 'source-l1', nameID: 'source-subspace' },
    ]);
    const qb = mockQueryBuilder();
    vi.mocked(entityManager.createQueryBuilder).mockReturnValue(qb as never);
    vi.mocked(spaceLookupService.getAllDescendantSpaceIDs).mockResolvedValue(
      []
    );
    vi.mocked(roleSetService.setParentRoleSetAndCredentials).mockResolvedValue({
      id: 'roleset-l1',
    });
    vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
      tagsetTemplates: [],
    });
    vi.mocked(spaceService.save).mockImplementation(async (s: unknown) => s);
    return qb;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversionService);
    spaceService = module.get(SpaceService) as unknown as Record<string, Mock>;
    roleSetService = module.get(RoleSetService) as unknown as Record<
      string,
      Mock
    >;
    namingService = module.get(NamingService) as unknown as Record<
      string,
      Mock
    >;
    entityManager = module.get(EntityManager) as unknown as Record<
      string,
      Mock
    >;
    spaceLookupService = module.get(SpaceLookupService) as unknown as Record<
      string,
      Mock
    >;
    calloutsSetService = module.get(CalloutsSetService) as unknown as Record<
      string,
      Mock
    >;
    activityService = module.get(ActivityService) as unknown as Record<
      string,
      Mock
    >;
  });

  // ── moveSpaceL1ToSpaceL0OrFail ──────────────────────────────────

  describe('moveSpaceL1ToSpaceL0OrFail', () => {
    it('should throw EntityNotInitializedException when source L1 is missing community', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'source-l1',
        community: undefined,
        storageAggregator: {},
        subspaces: [],
      });

      await expect(
        service.moveSpaceL1ToSpaceL0OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should reject when source is not L1', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1({ level: SpaceLevel.L0 }))
        .mockResolvedValueOnce(makeTargetL0());

      await expect(
        service.moveSpaceL1ToSpaceL0OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject when target is not L0', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0({ level: SpaceLevel.L1 }));

      await expect(
        service.moveSpaceL1ToSpaceL0OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject self-move (source already under target L0)', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1({ levelZeroSpaceID: 'target-l0' }))
        .mockResolvedValueOnce(makeTargetL0());

      await expect(
        service.moveSpaceL1ToSpaceL0OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject nameID collision in target L0 scope', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      vi.mocked(
        namingService.getReservedNameIDsInLevelZeroSpace
      ).mockResolvedValue(['source-subspace']);
      vi.mocked(entityManager.find).mockResolvedValue([
        { id: 'source-l1', nameID: 'source-subspace' },
      ]);

      await expect(
        service.moveSpaceL1ToSpaceL0OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should clear ALL community roles including admins', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      // Override roles to include members and admins
      vi.mocked(roleSetService.getUsersWithRole)
        .mockResolvedValueOnce([{ id: 'user-member' }]) // MEMBER
        .mockResolvedValueOnce([{ id: 'user-lead' }]) // LEAD
        .mockResolvedValueOnce([{ id: 'user-admin' }]); // ADMIN

      await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      // Admin removal should be called explicitly
      expect(roleSetService.removeActorFromRole).toHaveBeenCalledWith(
        expect.anything(),
        'admin',
        'user-admin',
        false
      );
    });

    it('should set sortOrder to 0 and shift existing children up by 1', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      const qb = setupHappyPathMocks();

      const result = await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      // Verify insert-first: sortOrder = 0
      expect(result.space.sortOrder).toBe(0);
      // Verify shift query was called (createQueryBuilder used for shift + bulk levelZeroSpaceID)
      expect(entityManager.createQueryBuilder).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: expect.any(Function),
        })
      );
    });

    it('should bulk update descendant levelZeroSpaceIDs', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      const qb = setupHappyPathMocks();
      vi.mocked(spaceLookupService.getAllDescendantSpaceIDs)
        .mockResolvedValueOnce(['child-l2-a', 'child-l2-b']) // for bulk update
        .mockResolvedValueOnce(['child-l2-a', 'child-l2-b']); // for syncInnovationFlow

      await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(qb.whereInIds).toHaveBeenCalledWith(['child-l2-a', 'child-l2-b']);
    });

    it('should update storageAggregator and roleSet parent', async () => {
      const sourceL1 = makeSourceL1();
      const targetL0 = makeTargetL0();
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(sourceL1)
        .mockResolvedValueOnce(targetL0);
      setupHappyPathMocks();

      const result = await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(result.space.storageAggregator?.parentStorageAggregator).toBe(
        targetL0.storageAggregator
      );
      expect(
        roleSetService.setParentRoleSetAndCredentials
      ).toHaveBeenCalledWith(
        sourceL1.community.roleSet,
        targetL0.community.roleSet
      );
    });

    // Issue alkem-io/server#6019 — pending invites/apps must be cleared
    // because old targets break (alkem-io/server#5069).
    it('should clear pending invitations and applications on the source L1 roleSet', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith(['roleset-l1']);
    });

    it('should clear pending invitations and applications on every descendant roleSet', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();
      vi.mocked(spaceLookupService.getAllDescendantSpaceIDs).mockResolvedValue([
        'child-l2-a',
      ]);
      vi.mocked(spaceService.getAllSpaces).mockResolvedValue([
        {
          id: 'child-l2-a',
          community: { roleSet: { id: 'roleset-child-l2-a' } },
        },
      ] as never);

      await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith(['roleset-l1', 'roleset-child-l2-a']);
    });

    it('should drop the stale SUBSPACE_CREATED activity entry on the source parent', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      await service.moveSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(
        activityService.removeSubspaceCreatedActivityForResource
      ).toHaveBeenCalledWith('source-l1');
    });
  });

  // ── moveSpaceL1ToSpaceL2OrFail ──────────────────────────────────

  describe('moveSpaceL1ToSpaceL2OrFail', () => {
    it('should reject when source is not L1', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1({ level: SpaceLevel.L2 }))
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());

      await expect(
        service.moveSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject when source and target are in same L0', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1({ levelZeroSpaceID: 'source-l0' }))
        .mockResolvedValueOnce(makeTargetL0());

      await expect(
        service.moveSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject when source L1 has L2 children (depth overflow)', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(
          makeSourceL1({ subspaces: [{ id: 'child-l2' }] })
        )
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());

      await expect(
        service.moveSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should reject nameID collision in target L0 scope', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());
      vi.mocked(
        namingService.getReservedNameIDsInLevelZeroSpace
      ).mockResolvedValue(['source-subspace']);
      vi.mocked(entityManager.find).mockResolvedValue([
        { id: 'source-l1', nameID: 'source-subspace' },
      ]);

      await expect(
        service.moveSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'source-l1',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should change level from L1 to L2 and update parent', async () => {
      const sourceL1 = makeSourceL1();
      const targetL1 = makeTargetL1();
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(sourceL1)
        .mockResolvedValueOnce(targetL1)
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      const result = await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(result.space.level).toBe(SpaceLevel.L2);
      expect(result.space.parentSpace).toBe(targetL1);
      expect(result.space.levelZeroSpaceID).toBe('target-l0');
    });

    it('should clear ALL community roles including admins (cross-L0)', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      vi.mocked(roleSetService.getUsersWithRole)
        .mockResolvedValueOnce([{ id: 'user-member' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'user-admin' }]);

      await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(roleSetService.removeActorFromRole).toHaveBeenCalledWith(
        expect.anything(),
        'admin',
        'user-admin',
        false
      );
    });

    it('should set sortOrder to 0 (insert-first)', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      const result = await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(result.space.sortOrder).toBe(0);
    });

    it('should update storageAggregator parent to target L1', async () => {
      const sourceL1 = makeSourceL1();
      const targetL1 = makeTargetL1();
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(sourceL1)
        .mockResolvedValueOnce(targetL1)
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      const result = await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(result.space.storageAggregator?.parentStorageAggregator).toBe(
        targetL1.storageAggregator
      );
      expect(
        roleSetService.setParentRoleSetAndCredentials
      ).toHaveBeenCalledWith(
        sourceL1.community.roleSet,
        targetL1.community.roleSet
      );
    });

    // Issue alkem-io/server#6019 — pending invites/apps must be cleared
    // (alkem-io/server#5069).
    it('should clear pending invitations and applications on the source L1 roleSet', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith('roleset-l1');
    });

    it('should drop the stale SUBSPACE_CREATED activity entry on the source parent', async () => {
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(makeSourceL1())
        .mockResolvedValueOnce(makeTargetL1())
        .mockResolvedValueOnce(makeTargetL0());
      setupHappyPathMocks();

      await service.moveSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'source-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(
        activityService.removeSubspaceCreatedActivityForResource
      ).toHaveBeenCalledWith('source-l1');
    });
  });

  // ── dispatchAutoInvitesAfterMove ────────────────────────────────

  describe('dispatchAutoInvitesAfterMove', () => {
    const setupAutoInviteMocks = (
      targetL0Members: { id: string }[],
      movedSpaceRoleSetId = 'roleset-moved'
    ) => {
      // Target L0 with community
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce({
          id: 'target-l0',
          community: { roleSet: { id: 'roleset-target' } },
        })
        .mockResolvedValueOnce({
          id: 'moved-space',
          community: { roleSet: { id: movedSpaceRoleSetId } },
        });
      // Target L0 community roles
      vi.mocked(roleSetService.getUsersWithRole)
        .mockResolvedValueOnce(targetL0Members) // MEMBER
        .mockResolvedValueOnce([]) // LEAD
        .mockResolvedValueOnce([]); // ADMIN
      vi.mocked(roleSetService.getOrganizationsWithRole).mockResolvedValue([]);
      vi.mocked(
        roleSetService.getVirtualContributorsWithRole
      ).mockResolvedValue([]);
      // Return an invitation with an id for notification dispatch
      vi.mocked(roleSetService.createInvitationExistingActor).mockResolvedValue(
        { id: 'invitation-1' } as never
      );
    };

    it('should send invitations only to overlap set', async () => {
      setupAutoInviteMocks([{ id: 'user-a' }, { id: 'user-b' }]);

      await service.dispatchAutoInvitesAfterMove(
        ['user-a', 'user-c'], // user-a overlaps, user-c does not
        'target-l0',
        'moved-space',
        'admin-user',
        'Welcome!'
      );

      expect(
        roleSetService.createInvitationExistingActor
      ).toHaveBeenCalledTimes(1);
      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalledWith(
        {
          invitedActorID: 'user-a',
          welcomeMessage: 'Welcome!',
          createdBy: 'admin-user',
          roleSetID: 'roleset-moved',
          invitedToParent: false,
          extraRoles: [],
        }
      );
    });

    it('should send zero invitations when overlap set is empty', async () => {
      setupAutoInviteMocks([{ id: 'user-b' }]);

      await service.dispatchAutoInvitesAfterMove(
        ['user-c'], // no overlap with target L0 members
        'target-l0',
        'moved-space',
        'admin-user'
      );

      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    it('should not throw when invitation creation fails', async () => {
      setupAutoInviteMocks([{ id: 'user-a' }]);
      vi.mocked(roleSetService.createInvitationExistingActor).mockRejectedValue(
        new Error('Invitation service unavailable')
      );

      // Should not throw — errors are logged, not propagated
      await expect(
        service.dispatchAutoInvitesAfterMove(
          ['user-a'],
          'target-l0',
          'moved-space',
          'admin-user'
        )
      ).resolves.toBeUndefined();
    });

    it('should use custom message when provided', async () => {
      setupAutoInviteMocks([{ id: 'user-a' }]);

      await service.dispatchAutoInvitesAfterMove(
        ['user-a'],
        'target-l0',
        'moved-space',
        'admin-user',
        'Custom welcome message'
      );

      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalledWith(
        expect.objectContaining({
          welcomeMessage: 'Custom welcome message',
        })
      );
    });
  });
});
