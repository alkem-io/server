import { A22_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationPrivilege } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
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
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
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

describe('VirtualContributorResolverMutations.adminUpdateVirtualContributorPromote', () => {
  let module: TestingModule;
  let resolver: VirtualContributorResolverMutations;
  let service: VirtualContributorService;
  let authorizationService: AuthorizationService;
  let platformResourceAuditService: PlatformResourceAuditService;
  const actorContext = { actorID: 'content-1' } as any;
  const platformPolicy = { id: 'platform-auth' } as any;

  const loaded = (promote: boolean) =>
    ({
      id: 'res-1',
      promote,
      authorization: { id: 'own-auth' },
      listedInStore: true,
      searchVisibility: 'public',
      platformSettings: { promptGraphEditingEnabled: false },
    }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    module = await Test.createTestingModule({
      providers: [
        VirtualContributorResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(VirtualContributorResolverMutations);
    service = module.get(VirtualContributorService);
    authorizationService = module.get(AuthorizationService);
    platformResourceAuditService = module.get(PlatformResourceAuditService);
    vi.mocked(
      module.get(PlatformAuthorizationPolicyService)
        .getPlatformAuthorizationPolicy
    ).mockResolvedValue(platformPolicy);
    vi.mocked(service.save).mockImplementation(async entity => entity as any);
  });

  it('a PLATFORM_PROMOTE_MANAGE holder sets the flag, gated on the PLATFORM policy (not the resource policy), and it is audited', async () => {
    vi.mocked(service.getVirtualContributorByIdOrFail).mockResolvedValue(
      loaded(false)
    );
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateVirtualContributorPromote(
      actorContext,
      {
        virtualContributorID: 'res-1',
        promote: true,
      }
    );

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(1);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_PROMOTE_MANAGE,
      expect.any(String)
    );
    expect(service.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1', promote: true })
    );
    expect(
      platformResourceAuditService.recordEventForActor
    ).toHaveBeenCalledWith(actorContext, A22_INTENDED_OWNERS, {
      resourceKind: 'virtual_contributor',
      resourceId: 'res-1',
      promote: true,
      outcome: 'promote_changed',
    });
    expect(result.promote).toBe(true);
  });

  it('a refused caller changes nothing and is not audited', async () => {
    vi.mocked(service.getVirtualContributorByIdOrFail).mockResolvedValue(
      loaded(false)
    );
    vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(
      resolver.adminUpdateVirtualContributorPromote(actorContext, {
        virtualContributorID: 'res-1',
        promote: true,
      })
    ).rejects.toThrow('forbidden');
    expect(service.save).not.toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).not.toHaveBeenCalled();
  });

  it('re-applying the current value succeeds (idempotent) but is not audited as a change', async () => {
    vi.mocked(service.getVirtualContributorByIdOrFail).mockResolvedValue(
      loaded(true)
    );
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateVirtualContributorPromote(
      actorContext,
      {
        virtualContributorID: 'res-1',
        promote: true,
      }
    );

    expect(result.promote).toBe(true);
    expect(
      platformResourceAuditService.recordEventForActor
    ).not.toHaveBeenCalled();
  });

  it('changes nothing else on the resource and re-applies no authorization', async () => {
    vi.mocked(service.getVirtualContributorByIdOrFail).mockResolvedValue(
      loaded(false)
    );
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateVirtualContributorPromote(
      actorContext,
      {
        virtualContributorID: 'res-1',
        promote: true,
      }
    );

    expect((result as any).listedInStore).toEqual(true);
    expect((result as any).searchVisibility).toEqual('public');
    expect((result as any).platformSettings).toEqual({
      promptGraphEditingEnabled: false,
    });
    expect(
      module.get(VirtualContributorAuthorizationService)
        .applyAuthorizationPolicy
    ).not.toHaveBeenCalled();
  });
});
