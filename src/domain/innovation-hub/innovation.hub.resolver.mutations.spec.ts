import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { InnovationHubResolverMutations } from './innovation.hub.resolver.mutations';
import { InnovationHubService } from './innovation.hub.service';

describe('InnovationHubResolverMutations', () => {
  let resolver: InnovationHubResolverMutations;
  let authorizationService: AuthorizationService;
  let innovationHubService: InnovationHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(existingHub);
      (authorizationService as any).grantAccessOrFail = vi
        .fn()
        .mockResolvedValue(undefined);
      (innovationHubService as any).updateOrFail = vi
        .fn()
        .mockResolvedValue(updatedHub);

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

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(existingHub);
      (authorizationService as any).grantAccessOrFail = vi
        .fn()
        .mockRejectedValue(new Error('Forbidden'));

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

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(existingHub);
      (authorizationService as any).grantAccessOrFail = vi
        .fn()
        .mockResolvedValue(undefined);
      (innovationHubService as any).delete = vi
        .fn()
        .mockResolvedValue(deletedHub);

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

      (innovationHubService as any).getInnovationHubOrFail = vi
        .fn()
        .mockResolvedValue(existingHub);
      (authorizationService as any).grantAccessOrFail = vi
        .fn()
        .mockRejectedValue(new Error('Forbidden'));

      // Act & Assert
      await expect(
        resolver.deleteInnovationHub(actorContext, deleteData)
      ).rejects.toThrow('Forbidden');
    });
  });
});
