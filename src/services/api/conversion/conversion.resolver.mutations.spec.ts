import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CalloutTransferService } from '@domain/collaboration/callout-transfer/callout.transfer.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { SpaceLicenseService } from '@domain/space/space/space.service.license';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { ConversionResolverMutations } from './conversion.resolver.mutations';
import { ConversionService } from './conversion.service';

describe('ConversionResolverMutations', () => {
  let resolver: ConversionResolverMutations;
  let authorizationService: { grantAccessOrFail: Mock };
  let conversionService: {
    convertSpaceL1ToSpaceL0OrFail: Mock;
    convertSpaceL2ToSpaceL1OrFail: Mock;
    convertSpaceL1ToSpaceL2OrFail: Mock;
  };
  let spaceService: {
    save: Mock;
    getSpaceOrFail: Mock;
    getAccountForLevelZeroSpaceOrFail: Mock;
    invalidateUrlCacheForSpaceSubtree: Mock;
  };
  let spaceAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: {
    saveAll: Mock;
    createGlobalRolesAuthorizationPolicy: Mock;
  };
  let virtualContributorService: {
    getVirtualContributorByIdOrFail: Mock;
  };
  let _calloutTransferService: { transferCallout: Mock };
  let spaceLicenseService: { applyLicensePolicy: Mock };
  let licenseService: { saveAll: Mock };

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ConversionResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    conversionService = module.get(ConversionService) as any;
    spaceService = module.get(SpaceService) as any;
    spaceAuthorizationService = module.get(SpaceAuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    virtualContributorService = module.get(VirtualContributorService) as any;
    _calloutTransferService = module.get(CalloutTransferService) as any;
    spaceLicenseService = module.get(SpaceLicenseService) as any;
    licenseService = module.get(LicenseService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('convertSpaceL1ToSpaceL0', () => {
    it('should check platform admin authorization and call conversion service', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      const convertedSpace = { id: 'space-l0' };
      conversionService.convertSpaceL1ToSpaceL0OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);

      const result = await resolver.convertSpaceL1ToSpaceL0(actorContext, {
        spaceL1ID: 'space-l1',
      });

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.anything(),
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(
        conversionService.convertSpaceL1ToSpaceL0OrFail
      ).toHaveBeenCalledWith({ spaceL1ID: 'space-l1' });
      expect(
        spaceService.invalidateUrlCacheForSpaceSubtree
      ).toHaveBeenCalledWith('space-l0');
      expect(result).toBe(convertedSpace);
    });

    it('reconciles the Free license entitlements after promotion', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      const convertedSpace = { id: 'space-l0' };
      conversionService.convertSpaceL1ToSpaceL0OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      const updatedLicenses = [{ id: 'license-1' }];
      spaceLicenseService.applyLicensePolicy.mockResolvedValue(updatedLicenses);
      licenseService.saveAll.mockResolvedValue(undefined);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);

      await resolver.convertSpaceL1ToSpaceL0(actorContext, {
        spaceL1ID: 'space-l1',
      });

      expect(spaceLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
        'space-l0'
      );
      expect(licenseService.saveAll).toHaveBeenCalledWith(updatedLicenses);
      expect(
        spaceLicenseService.applyLicensePolicy.mock.invocationCallOrder[0]
      ).toBeGreaterThan(
        authorizationPolicyService.saveAll.mock.invocationCallOrder[0]
      );
    });
  });

  describe('convertSpaceL2ToSpaceL1', () => {
    it('should check authorization and call conversion service', async () => {
      const convertedSpace = {
        id: 'space-l1',
        parentSpace: { authorization: { id: 'auth-parent' } },
      };
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      conversionService.convertSpaceL2ToSpaceL1OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.convertSpaceL2ToSpaceL1(actorContext, {
        spaceL2ID: 'space-l2',
      });

      expect(
        conversionService.convertSpaceL2ToSpaceL1OrFail
      ).toHaveBeenCalledWith({ spaceL2ID: 'space-l2' });
      expect(
        spaceService.invalidateUrlCacheForSpaceSubtree
      ).toHaveBeenCalledWith('space-l1');
      expect(result).toBe(convertedSpace);
    });
  });

  describe('convertSpaceL1ToSpaceL2', () => {
    it('should check authorization and call conversion service', async () => {
      const convertedSpace = {
        id: 'space-l2',
        parentSpace: { authorization: { id: 'auth-parent' } },
      };
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      conversionService.convertSpaceL1ToSpaceL2OrFail.mockResolvedValue(
        convertedSpace
      );
      spaceService.save.mockResolvedValue(convertedSpace);
      spaceService.getSpaceOrFail.mockResolvedValue(convertedSpace);
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.convertSpaceL1ToSpaceL2(actorContext, {
        spaceL1ID: 'space-l1',
        parentSpaceL1ID: 'parent-l1',
      });

      expect(
        conversionService.convertSpaceL1ToSpaceL2OrFail
      ).toHaveBeenCalledWith({
        spaceL1ID: 'space-l1',
        parentSpaceL1ID: 'parent-l1',
      });
      expect(
        spaceService.invalidateUrlCacheForSpaceSubtree
      ).toHaveBeenCalledWith('space-l2');
      expect(result).toBe(convertedSpace);
    });
  });

  describe('convertVirtualContributorToUseKnowledgeBase', () => {
    it('should check authorization and throw when VC is missing entities', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: undefined,
          account: undefined,
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC is not of type ALKEMIO_SPACE', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'OTHER_TYPE',
          bodyOfKnowledgeID: 'body-1',
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC has no body of knowledge ID', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: undefined,
        }
      );

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when space is missing collaboration entities', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: 'space-1',
        }
      );
      spaceService.getSpaceOrFail.mockResolvedValue({
        id: 'space-1',
        collaboration: undefined,
      });

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });

    it('should throw when VC and space belong to different accounts', async () => {
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        {
          id: 'vc-1',
          knowledgeBase: { calloutsSet: { id: 'cs-1' } },
          account: { id: 'acc-1' },
          bodyOfKnowledgeType: 'alkemio-space',
          bodyOfKnowledgeID: 'space-1',
        }
      );
      spaceService.getSpaceOrFail.mockResolvedValue({
        id: 'space-1',
        collaboration: {
          calloutsSet: { id: 'cs-2', callouts: [] },
        },
      });
      spaceService.getAccountForLevelZeroSpaceOrFail.mockResolvedValue({
        id: 'acc-2',
      });

      await expect(
        resolver.convertVirtualContributorToUseKnowledgeBase(actorContext, {
          virtualContributorID: 'vc-1',
        })
      ).rejects.toThrow();
    });
  });

  // ── moveSpaceL2ToSpaceL1 (T006: S7–S10) ──────────────────────────

  describe('moveSpaceL2ToSpaceL1', () => {
    // Convenience setup: wires up all the service mocks needed for the happy path
    const setupMoveL2L1HappyPath = (
      platformRolesAccessFromTarget = { roles: ['REGISTERED'] }
    ) => {
      const savedSpaceId = 'saved-l2-space';
      const movedSpace = {
        id: savedSpaceId,
        levelZeroSpaceID: 'target-l0',
        platformRolesAccess: { roles: [] }, // old value before recompute
      };
      const savedSpace = { ...movedSpace };
      const targetParentL1 = {
        id: 'target-l1',
        platformRolesAccess: platformRolesAccessFromTarget,
      };

      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      (conversionService as any).moveSpaceL2ToSpaceL1OrFail.mockResolvedValue({
        space: movedSpace,
        removedActorIds: ['actor-removed'],
      });
      spaceService.save.mockResolvedValue(savedSpace);
      // Call sequence for getSpaceOrFail:
      // 1. targetParentL1 — for updatePlatformRolesAccessRecursively
      // 2. subspace with parentSpace.authorization — for getParentSpaceAuthorization
      // 3. final return
      spaceService.getSpaceOrFail
        .mockResolvedValueOnce(targetParentL1)
        .mockResolvedValueOnce({
          id: savedSpaceId,
          parentSpace: { authorization: { id: 'parent-auth' } },
        })
        .mockResolvedValue({ id: savedSpaceId });
      (spaceService as any).updatePlatformRolesAccessRecursively = vi
        .fn()
        .mockImplementation(async (space: any, parentAccess: any) => {
          space.platformRolesAccess = parentAccess;
          return space;
        });
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      (conversionService as any).invalidateUrlCachesForSubtree = vi
        .fn()
        .mockResolvedValue(undefined);
      (conversionService as any).moveRoomsService = {
        handleRoomsDuringMove: vi.fn().mockResolvedValue(undefined),
      };
      (conversionService as any).dispatchAutoInvitesAfterMove = vi
        .fn()
        .mockResolvedValue(undefined);

      return { movedSpace, savedSpace, targetParentL1 };
    };

    // S9 — non-PLATFORM_ADMIN rejected before any service call
    it('should reject non-PLATFORM_ADMIN before any service call (S9)', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        resolver.moveSpaceL2ToSpaceL1(actorContext, {
          spaceL2ID: 'space-l2',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow('Unauthorized');

      expect(
        (conversionService as any).moveSpaceL2ToSpaceL1OrFail
      ).not.toHaveBeenCalled();
    });

    // S7 (R-1/R-5 pattern): recompute assertion —
    // updatePlatformRolesAccessRecursively called with the moved space +
    // the TARGET parent's platformRolesAccess BEFORE applyAuthorizationPolicy,
    // and the space's platform-READ access equals the value recomputed from
    // the target chain — assert the VALUE, not just the call.
    it('should recompute platformRolesAccess from target parent BEFORE applyAuthorizationPolicy (S7/R-1)', async () => {
      const targetPlatformAccess = { roles: ['REGISTERED', 'ANONYMOUS'] };
      const { movedSpace } = setupMoveL2L1HappyPath(targetPlatformAccess);

      await resolver.moveSpaceL2ToSpaceL1(actorContext, {
        spaceL2ID: 'space-l2',
        targetSpaceL1ID: 'target-l1',
      });

      // Assert updatePlatformRolesAccessRecursively called with the moved space
      // and the target parent's platformRolesAccess
      expect(
        (spaceService as any).updatePlatformRolesAccessRecursively
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: movedSpace.id }),
        targetPlatformAccess
      );

      // Assert the call order: recompute BEFORE applyAuthorizationPolicy
      const recomputeOrder = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.invocationCallOrder[0];
      const authPolicyOrder =
        spaceAuthorizationService.applyAuthorizationPolicy.mock
          .invocationCallOrder[0];
      expect(recomputeOrder).toBeLessThan(authPolicyOrder);

      // Assert the VALUE (S7): the second argument to the recompute call is
      // exactly the target parent's platformRolesAccess (not a copy, the same ref).
      const recomputeCallArgs = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.calls[0];
      expect(recomputeCallArgs[1]).toBe(targetPlatformAccess);
    });

    // S8 (FR-013): handleRoomsDuringMove invoked post-commit; rejection
    // neither throws nor rolls back the move
    it('should call handleRoomsDuringMove post-commit; its rejection does not throw (S8/FR-013)', async () => {
      setupMoveL2L1HappyPath();
      (conversionService as any).moveRoomsService.handleRoomsDuringMove = vi
        .fn()
        .mockRejectedValue(new Error('Matrix unavailable'));

      // Should NOT throw even though rooms service fails
      await expect(
        resolver.moveSpaceL2ToSpaceL1(actorContext, {
          spaceL2ID: 'space-l2',
          targetSpaceL1ID: 'target-l1',
        })
      ).resolves.toBeDefined();

      expect(
        (conversionService as any).moveRoomsService.handleRoomsDuringMove
      ).toHaveBeenCalledWith('saved-l2-space', ['actor-removed']);
    });

    // S10 (US4 server proof): autoInvite on → dispatchAutoInvitesAfterMove
    // called with exact args; off → not called
    it('autoInvite on → dispatchAutoInvitesAfterMove called with exact args (S10)', async () => {
      setupMoveL2L1HappyPath();

      await resolver.moveSpaceL2ToSpaceL1(actorContext, {
        spaceL2ID: 'space-l2',
        targetSpaceL1ID: 'target-l1',
        autoInvite: true,
        invitationMessage: 'Welcome back!',
      });

      expect(
        (conversionService as any).dispatchAutoInvitesAfterMove
      ).toHaveBeenCalledWith(
        ['actor-removed'],
        'target-l0',
        'saved-l2-space',
        actorContext.actorID,
        'Welcome back!'
      );
    });

    it('autoInvite off → dispatchAutoInvitesAfterMove NOT called (S10)', async () => {
      setupMoveL2L1HappyPath();

      await resolver.moveSpaceL2ToSpaceL1(actorContext, {
        spaceL2ID: 'space-l2',
        targetSpaceL1ID: 'target-l1',
        autoInvite: false,
      });

      expect(
        (conversionService as any).dispatchAutoInvitesAfterMove
      ).not.toHaveBeenCalled();
    });
  });

  // Regression guard for the anonymous-visibility leak: a cross-L0 move must
  // recompute platformRolesAccess from the NEW target hierarchy BEFORE the
  // authorization policy is re-applied — otherwise a public L1 moved into a
  // private L0 keeps stale anonymous READ. Mirrors the moveSpaceL2ToSpaceL1
  // recompute proof above.
  describe('moveSpaceL1ToSpaceL0', () => {
    const setupMoveL1L0HappyPath = (
      platformRolesAccessFromTarget = { roles: ['REGISTERED'] }
    ) => {
      const savedSpaceId = 'saved-l1-space';
      const movedSpace = {
        id: savedSpaceId,
        levelZeroSpaceID: 'target-l0',
        platformRolesAccess: { roles: [] }, // old value before recompute
      };
      const savedSpace = { ...movedSpace };
      const targetParentL0 = {
        id: 'target-l0',
        platformRolesAccess: platformRolesAccessFromTarget,
      };

      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      (conversionService as any).moveSpaceL1ToSpaceL0OrFail.mockResolvedValue({
        space: movedSpace,
        removedActorIds: ['actor-removed'],
      });
      spaceService.save.mockResolvedValue(savedSpace);
      // getSpaceOrFail sequence: 1. targetParentL0 (recompute), 2. moved space
      // with parentSpace.authorization (getParentSpaceAuthorization), 3. return.
      spaceService.getSpaceOrFail
        .mockResolvedValueOnce(targetParentL0)
        .mockResolvedValueOnce({
          id: savedSpaceId,
          parentSpace: { authorization: { id: 'parent-auth' } },
        })
        .mockResolvedValue({ id: savedSpaceId });
      (spaceService as any).updatePlatformRolesAccessRecursively = vi
        .fn()
        .mockImplementation(async (space: any, parentAccess: any) => {
          space.platformRolesAccess = parentAccess;
          return space;
        });
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      (conversionService as any).invalidateUrlCachesForSubtree = vi
        .fn()
        .mockResolvedValue(undefined);
      (conversionService as any).moveRoomsService = {
        handleRoomsDuringMove: vi.fn().mockResolvedValue(undefined),
      };
      (conversionService as any).dispatchAutoInvitesAfterMove = vi
        .fn()
        .mockResolvedValue(undefined);

      return { movedSpace, targetParentL0 };
    };

    it('should reject non-PLATFORM_ADMIN before any service call', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        resolver.moveSpaceL1ToSpaceL0(actorContext, {
          spaceL1ID: 'space-l1',
          targetSpaceL0ID: 'target-l0',
        })
      ).rejects.toThrow('Unauthorized');

      expect(
        (conversionService as any).moveSpaceL1ToSpaceL0OrFail
      ).not.toHaveBeenCalled();
    });

    it('should recompute platformRolesAccess from target L0 BEFORE applyAuthorizationPolicy', async () => {
      const targetPlatformAccess = { roles: ['REGISTERED', 'ANONYMOUS'] };
      const { movedSpace } = setupMoveL1L0HappyPath(targetPlatformAccess);

      await resolver.moveSpaceL1ToSpaceL0(actorContext, {
        spaceL1ID: 'space-l1',
        targetSpaceL0ID: 'target-l0',
      });

      expect(
        (spaceService as any).updatePlatformRolesAccessRecursively
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: movedSpace.id }),
        targetPlatformAccess
      );

      const recomputeOrder = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.invocationCallOrder[0];
      const authPolicyOrder =
        spaceAuthorizationService.applyAuthorizationPolicy.mock
          .invocationCallOrder[0];
      expect(recomputeOrder).toBeLessThan(authPolicyOrder);

      const recomputeCallArgs = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.calls[0];
      expect(recomputeCallArgs[1]).toBe(targetPlatformAccess);
    });
  });

  describe('moveSpaceL1ToSpaceL2', () => {
    const setupMoveL1L2HappyPath = (
      platformRolesAccessFromTarget = { roles: ['REGISTERED'] }
    ) => {
      const savedSpaceId = 'saved-l1-l2-space';
      const movedSpace = {
        id: savedSpaceId,
        levelZeroSpaceID: 'target-l0',
        platformRolesAccess: { roles: [] }, // old value before recompute
      };
      const savedSpace = { ...movedSpace };
      const targetParentL1 = {
        id: 'target-l1',
        platformRolesAccess: platformRolesAccessFromTarget,
      };

      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      (conversionService as any).moveSpaceL1ToSpaceL2OrFail.mockResolvedValue({
        space: movedSpace,
        removedActorIds: ['actor-removed'],
      });
      spaceService.save.mockResolvedValue(savedSpace);
      // getSpaceOrFail sequence: 1. targetParentL1 (recompute), 2. moved space
      // with parentSpace.authorization (getParentSpaceAuthorization), 3. return.
      spaceService.getSpaceOrFail
        .mockResolvedValueOnce(targetParentL1)
        .mockResolvedValueOnce({
          id: savedSpaceId,
          parentSpace: { authorization: { id: 'parent-auth' } },
        })
        .mockResolvedValue({ id: savedSpaceId });
      (spaceService as any).updatePlatformRolesAccessRecursively = vi
        .fn()
        .mockImplementation(async (space: any, parentAccess: any) => {
          space.platformRolesAccess = parentAccess;
          return space;
        });
      spaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      (conversionService as any).invalidateUrlCachesForSubtree = vi
        .fn()
        .mockResolvedValue(undefined);
      (conversionService as any).moveRoomsService = {
        handleRoomsDuringMove: vi.fn().mockResolvedValue(undefined),
      };
      (conversionService as any).dispatchAutoInvitesAfterMove = vi
        .fn()
        .mockResolvedValue(undefined);

      return { movedSpace, targetParentL1 };
    };

    it('should reject non-PLATFORM_ADMIN before any service call', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        resolver.moveSpaceL1ToSpaceL2(actorContext, {
          spaceL1ID: 'space-l1',
          targetSpaceL1ID: 'target-l1',
        })
      ).rejects.toThrow('Unauthorized');

      expect(
        (conversionService as any).moveSpaceL1ToSpaceL2OrFail
      ).not.toHaveBeenCalled();
    });

    it('should recompute platformRolesAccess from target L1 BEFORE applyAuthorizationPolicy', async () => {
      const targetPlatformAccess = { roles: ['REGISTERED', 'ANONYMOUS'] };
      const { movedSpace } = setupMoveL1L2HappyPath(targetPlatformAccess);

      await resolver.moveSpaceL1ToSpaceL2(actorContext, {
        spaceL1ID: 'space-l1',
        targetSpaceL1ID: 'target-l1',
      });

      expect(
        (spaceService as any).updatePlatformRolesAccessRecursively
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: movedSpace.id }),
        targetPlatformAccess
      );

      const recomputeOrder = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.invocationCallOrder[0];
      const authPolicyOrder =
        spaceAuthorizationService.applyAuthorizationPolicy.mock
          .invocationCallOrder[0];
      expect(recomputeOrder).toBeLessThan(authPolicyOrder);

      const recomputeCallArgs = (spaceService as any)
        .updatePlatformRolesAccessRecursively.mock.calls[0];
      expect(recomputeCallArgs[1]).toBe(targetPlatformAccess);
    });
  });
});
