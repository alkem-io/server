import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { InnovationHubResolverMutations } from './innovation.hub.resolver.mutations';
import { InnovationHubService } from './innovation.hub.service';

describe('InnovationHubResolverMutations', () => {
  let module: TestingModule;
  let resolver: InnovationHubResolverMutations;
  let authorizationService: AuthorizationService;
  let innovationHubService: InnovationHubService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [
        InnovationHubResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationHubResolverMutations);
    authorizationService = module.get(AuthorizationService);
    innovationHubService = module.get(InnovationHubService);
  });

  describe('updateInnovationHub', () => {
    it('should check UPDATE authorization and delegate to service', async () => {
      // Arrange
      const actorContext = {} as ActorContext;
      const updateData = { ID: 'hub-1', nameID: 'new-name' } as any;
      const existingHub = {
        id: 'hub-1',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedHub = { id: 'hub-1', nameID: 'new-name' } as any;

      (innovationHubService as any).getInnovationHubOrFail.mockResolvedValue(
        existingHub
      );
      // 027-platform-role-redesign (T042): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      (authorizationService as any).isAccessGranted.mockReturnValue(false);
      (authorizationService as any).grantAccessOrFail.mockResolvedValue(
        undefined
      );
      (innovationHubService as any).updateOrFail.mockResolvedValue(updatedHub);

      // Act
      const result = await resolver.updateInnovationHub(
        actorContext,
        updateData
      );

      // Assert
      expect(result).toBe(updatedHub);
      expect(
        (innovationHubService as any).getInnovationHubOrFail
      ).toHaveBeenCalledWith('hub-1');
      expect(
        (authorizationService as any).grantAccessOrFail
      ).toHaveBeenCalledWith(
        actorContext,
        existingHub.authorization,
        AuthorizationPrivilege.UPDATE,
        'update innovation hub'
      );
      expect((innovationHubService as any).updateOrFail).toHaveBeenCalledWith(
        updateData
      );
    });

    it('should throw when authorization check fails', async () => {
      // Arrange
      const actorContext = {} as ActorContext;
      const updateData = { ID: 'hub-1' } as any;
      const existingHub = {
        id: 'hub-1',
        authorization: { id: 'auth-1' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail.mockResolvedValue(
        existingHub
      );
      (authorizationService as any).isAccessGranted.mockReturnValue(false);
      (authorizationService as any).grantAccessOrFail.mockRejectedValue(
        new Error('Forbidden')
      );

      // Act & Assert
      await expect(
        resolver.updateInnovationHub(actorContext, updateData)
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('deleteInnovationHub', () => {
    it('should check DELETE authorization and delegate to service', async () => {
      // Arrange
      const actorContext = {} as ActorContext;
      const deleteData = { ID: 'hub-1' } as any;
      const existingHub = {
        id: 'hub-1',
        authorization: { id: 'auth-1' },
      } as any;
      const deletedHub = { id: 'hub-1' } as any;

      (innovationHubService as any).getInnovationHubOrFail.mockResolvedValue(
        existingHub
      );
      (authorizationService as any).isAccessGranted.mockReturnValue(false);
      (authorizationService as any).grantAccessOrFail.mockResolvedValue(
        undefined
      );
      (innovationHubService as any).delete.mockResolvedValue(deletedHub);

      // Act
      const result = await resolver.deleteInnovationHub(
        actorContext,
        deleteData
      );

      // Assert
      expect(result).toBe(deletedHub);
      expect(
        (innovationHubService as any).getInnovationHubOrFail
      ).toHaveBeenCalledWith('hub-1');
      expect(
        (authorizationService as any).grantAccessOrFail
      ).toHaveBeenCalledWith(
        actorContext,
        existingHub.authorization,
        AuthorizationPrivilege.DELETE,
        'delete innovation hub'
      );
      expect((innovationHubService as any).delete).toHaveBeenCalledWith(
        'hub-1'
      );
    });

    it('should throw when authorization check fails', async () => {
      // Arrange
      const actorContext = {} as ActorContext;
      const deleteData = { ID: 'hub-1' } as any;
      const existingHub = {
        id: 'hub-1',
        authorization: { id: 'auth-1' },
      } as any;

      (innovationHubService as any).getInnovationHubOrFail.mockResolvedValue(
        existingHub
      );
      (authorizationService as any).isAccessGranted.mockReturnValue(false);
      (authorizationService as any).grantAccessOrFail.mockRejectedValue(
        new Error('Forbidden')
      );

      // Act & Assert
      await expect(
        resolver.deleteInnovationHub(actorContext, deleteData)
      ).rejects.toThrow('Forbidden');
    });
  });
  // ===================================================================
  // qual-server-12 + qual-server-13 (2026-07-31) — an A8 DUAL-PATH delete.
  // The suite above stubs `isAccessGranted` to `false` for both branches, so
  // only the fall-through denial path ran and the FR-018a audit write on the
  // PLATFORM branch was never entered. Both directions are pinned here:
  // recorded when `platform-content-full-access` authorized the delete,
  // silent when the owner did — an owner deleting their own resource is not
  // an administrative act.
  // ===================================================================
  describe('A8 platform-branch audit coverage (qual-server-12/13)', () => {
    const actorContext = { actorID: 'actor-1' } as any;
    const hub = { id: 'hub-1', authorization: { id: 'auth-1' } } as any;

    const grantOnly = (privilege: AuthorizationPrivilege) =>
      (authorizationService as any).isAccessGranted.mockImplementation(
        (_a: any, _p: any, requested: any) => requested === privilege
      );

    beforeEach(() => {
      (innovationHubService as any).getInnovationHubOrFail.mockResolvedValue(
        hub
      );
      (innovationHubService as any).delete.mockResolvedValue(hub);
      (authorizationService as any).grantAccessOrFail.mockResolvedValue(
        undefined
      );
    });

    it('records a `deleted` event on the PLATFORM branch', async () => {
      grantOnly(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);

      await resolver.deleteInnovationHub(actorContext, { ID: 'hub-1' } as any);

      expect(
        (authorizationService as any).grantAccessOrFail
      ).not.toHaveBeenCalled();
      expect(
        (module.get(PlatformResourceAuditService) as any).recordEventForActor
      ).toHaveBeenCalledWith(
        actorContext,
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ]),
        expect.any(Array),
        expect.objectContaining({
          resourceKind: 'innovation-hub',
          resourceId: 'hub-1',
          outcome: 'deleted',
        })
      );
    });

    it('records NOTHING on the OWNER branch', async () => {
      grantOnly(AuthorizationPrivilege.DELETE);

      await resolver.deleteInnovationHub(actorContext, { ID: 'hub-1' } as any);

      expect(
        (module.get(PlatformResourceAuditService) as any).recordEventForActor
      ).not.toHaveBeenCalled();
    });
  });
});
