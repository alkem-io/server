import { AuthorizationPrivilege } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';

describe('VirtualContributorResolverMutations', () => {
  let resolver: VirtualContributorResolverMutations;
  let virtualContributorService: {
    getVirtualContributorByIdOrFail: Mock;
    updateVirtualContributor: Mock;
    updateVirtualContributorSettings: Mock;
    updateVirtualContributorPlatformSettings: Mock;
    deleteVirtualContributor: Mock;
    refreshBodyOfKnowledge: Mock;
    save: Mock;
  };
  let authorizationService: {
    grantAccessOrFail: Mock;
  };
  let virtualContributorAuthorizationService: {
    applyAuthorizationPolicy: Mock;
  };
  let authorizationPolicyService: {
    saveAll: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(VirtualContributorResolverMutations);
    virtualContributorService = module.get(VirtualContributorService) as any;
    authorizationService = module.get(AuthorizationService) as any;
    virtualContributorAuthorizationService = module.get(
      VirtualContributorAuthorizationService
    ) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateVirtualContributor', () => {
    it('should check authorization, update VC, and reset authorization policy', async () => {
      const vc = { id: 'vc-1', authorization: { id: 'auth-1' } };
      const updatedVC = { id: 'vc-1', authorization: { id: 'auth-1' } };
      const finalVC = { id: 'vc-1' };
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail
        .mockResolvedValueOnce(vc)
        .mockResolvedValueOnce(finalVC);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.updateVirtualContributor.mockResolvedValue(
        updatedVC
      );
      virtualContributorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.updateVirtualContributor(actorContext, {
        ID: 'vc-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        vc.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toBe(finalVC);
    });
  });

  describe('updateVirtualContributorSettings', () => {
    it('should check authorization and update settings', async () => {
      const vc = {
        id: 'vc-1',
        authorization: { id: 'auth-1' },
        account: { authorization: { id: 'acc-auth-1' } },
      };
      const updatedVC = { id: 'vc-1' };
      const finalVC = { id: 'vc-1' };
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail
        .mockResolvedValueOnce(vc)
        .mockResolvedValueOnce(finalVC);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.updateVirtualContributorSettings.mockResolvedValue(
        updatedVC
      );
      virtualContributorService.save.mockResolvedValue(updatedVC);
      virtualContributorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.updateVirtualContributorSettings(
        actorContext,
        {
          virtualContributorID: 'vc-1',
          settings: {},
        } as any
      );

      expect(result).toBe(finalVC);
    });

    it('should throw RelationshipNotFoundException when account authorization is missing', async () => {
      const vc = {
        id: 'vc-1',
        authorization: { id: 'auth-1' },
        account: { authorization: undefined },
      };
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        vc
      );

      await expect(
        resolver.updateVirtualContributorSettings(actorContext, {
          virtualContributorID: 'vc-1',
          settings: {},
        } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('updateVirtualContributorPlatformSettings', () => {
    it('should check platform admin authorization and update settings', async () => {
      const vc = { id: 'vc-1', authorization: { id: 'auth-1' } };
      const updatedVC = { id: 'vc-1' };
      const finalVC = { id: 'vc-1' };
      const actorContext = { actorID: 'admin-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail
        .mockResolvedValueOnce(vc)
        .mockResolvedValueOnce(finalVC);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.updateVirtualContributorPlatformSettings.mockResolvedValue(
        updatedVC
      );
      virtualContributorAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const result = await resolver.updateVirtualContributorPlatformSettings(
        actorContext,
        {
          virtualContributorID: 'vc-1',
          settings: {},
        } as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        vc.authorization,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(finalVC);
    });
  });

  describe('deleteVirtualContributor', () => {
    it('should check DELETE authorization and delete VC', async () => {
      const vc = { id: 'vc-1', authorization: { id: 'auth-1' } };
      const deletedVC = { id: 'vc-1' };
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        vc
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.deleteVirtualContributor.mockResolvedValue(
        deletedVC
      );

      const result = await resolver.deleteVirtualContributor(actorContext, {
        ID: 'vc-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        vc.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(result).toBe(deletedVC);
    });
  });

  describe('refreshVirtualContributorBodyOfKnowledge', () => {
    it('should check UPDATE authorization and refresh body of knowledge', async () => {
      const vc = { id: 'vc-1', authorization: { id: 'auth-1' } };
      const actorContext = { actorID: 'user-1' } as any;

      virtualContributorService.getVirtualContributorByIdOrFail.mockResolvedValue(
        vc
      );
      authorizationService.grantAccessOrFail.mockReturnValue(undefined);
      virtualContributorService.refreshBodyOfKnowledge.mockResolvedValue(true);

      const result = await resolver.refreshVirtualContributorBodyOfKnowledge(
        actorContext,
        { virtualContributorID: 'vc-1' } as any
      );

      expect(result).toBe(true);
      expect(
        virtualContributorService.refreshBodyOfKnowledge
      ).toHaveBeenCalledWith(vc, actorContext);
    });
  });
});
