import { A22_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackResolverMutations } from './innovation.pack.resolver.mutations';
import { InnovationPackService } from './innovation.pack.service';

describe('InnovationPackResolverMutations', () => {
  let module: TestingModule;
  let resolver: InnovationPackResolverMutations;
  let innovationPackService: InnovationPackService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [
        InnovationPackResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationPackResolverMutations);
    innovationPackService = module.get(InnovationPackService);
    authorizationService = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateInnovationPack', () => {
    it('should verify authorization and delegate to service.update', async () => {
      const authorization = { id: 'auth-1' };
      const pack = {
        id: 'pack-1',
        authorization,
      } as unknown as IInnovationPack;
      const updatedPack = {
        id: 'pack-1',
        nameID: 'updated',
      } as unknown as IInnovationPack;
      const actorContext = { agentInfo: { email: 'test@test.com' } } as any;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      // 027-platform-role-redesign (T042/T043): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationPackService.update).mockResolvedValue(updatedPack);

      const result = await resolver.updateInnovationPack(actorContext, {
        ID: 'pack-1',
      } as any);

      expect(
        innovationPackService.getInnovationPackOrFail
      ).toHaveBeenCalledWith('pack-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(innovationPackService.update).toHaveBeenCalledWith(
        expect.objectContaining({ ID: 'pack-1' })
      );
      expect(result).toBe(updatedPack);
      // spec-server-9 fix: A7's dual path is UPDATE ∨
      // PLATFORM_SUPPORT_ORG_RESOURCES — assert the actual gate, not just
      // that a check happened.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
    });

    it('platform branch: allows PLATFORM_SUPPORT_ORG_RESOURCES without an owner UPDATE grant', async () => {
      const authorization = { id: 'auth-1' };
      const pack = {
        id: 'pack-1',
        authorization,
      } as unknown as IInnovationPack;
      const actorContext = { agentInfo: { email: 'test@test.com' } } as any;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      vi.mocked(authorizationService.isAccessGranted).mockImplementation(
        (_ctx, _auth, privilege) =>
          privilege === AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      vi.mocked(innovationPackService.update).mockResolvedValue(pack);

      await resolver.updateInnovationPack(actorContext, {
        ID: 'pack-1',
      } as any);

      // Neither branch of isAccessGranted was DELETE-owner true, so the
      // fallback grantAccessOrFail must NOT be reached.
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(innovationPackService.update).toHaveBeenCalled();
    });

    it('should use the pack id from getInnovationPackOrFail for the update call', async () => {
      const pack = {
        id: 'uuid-pack-1',
        authorization: {},
      } as unknown as IInnovationPack;
      const actorContext = {} as any;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      // 027-platform-role-redesign (T042/T043): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationPackService.update).mockResolvedValue(pack);

      await resolver.updateInnovationPack(actorContext, {
        ID: 'some-name-id',
      } as any);

      expect(innovationPackService.update).toHaveBeenCalledWith(
        expect.objectContaining({ ID: 'uuid-pack-1' })
      );
    });
  });

  describe('deleteInnovationPack', () => {
    it('should verify authorization and delegate to service.deleteInnovationPack', async () => {
      const authorization = { id: 'auth-1' };
      const pack = {
        id: 'pack-1',
        authorization,
      } as unknown as IInnovationPack;
      const actorContext = { agentInfo: { email: 'test@test.com' } } as any;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      // 027-platform-role-redesign (T042/T043): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);
      vi.mocked(authorizationService.grantAccessOrFail).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationPackService.deleteInnovationPack).mockResolvedValue(
        pack
      );

      const result = await resolver.deleteInnovationPack(actorContext, {
        ID: 'pack-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(innovationPackService.deleteInnovationPack).toHaveBeenCalledWith({
        ID: 'pack-1',
      });
      expect(result).toBe(pack);
      // spec-server-9 fix: A8's dual path is DELETE ∨
      // PLATFORM_CONTENT_FULL_ACCESS.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        authorization,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
    });
  });
  // ===================================================================
  // qual-server-12 + qual-server-13 (2026-07-31) — an A8 DUAL-PATH delete.
  // The suite above stubs `isAccessGranted` to `false` for both branches, so
  // only the fall-through denial path ran and the FR-018a audit write on the
  // PLATFORM branch was never entered. Both directions are pinned here.
  // ===================================================================
  describe('A8 platform-branch audit coverage (qual-server-12/13)', () => {
    const actorContext = { actorID: 'actor-1' } as any;
    const pack = { id: 'pack-1', authorization: { id: 'auth-1' } } as any;

    const grantOnly = (privilege: AuthorizationPrivilege) =>
      (authorizationService as any).isAccessGranted.mockImplementation(
        (_a: any, _p: any, requested: any) => requested === privilege
      );

    const resourceAudit = () => module.get(PlatformResourceAuditService) as any;

    beforeEach(() => {
      (innovationPackService as any).getInnovationPackOrFail.mockResolvedValue(
        pack
      );
      (innovationPackService as any).deleteInnovationPack.mockResolvedValue(
        pack
      );
      (authorizationService as any).grantAccessOrFail.mockResolvedValue(
        undefined
      );
    });

    it('records a `deleted` event on the PLATFORM branch', async () => {
      grantOnly(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);

      await resolver.deleteInnovationPack(actorContext, {
        ID: 'pack-1',
      } as any);

      expect(
        (authorizationService as any).grantAccessOrFail
      ).not.toHaveBeenCalled();
      expect(resourceAudit().recordEventForActor).toHaveBeenCalledWith(
        actorContext,
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ]),
        expect.objectContaining({
          resourceKind: 'innovation-pack',
          resourceId: 'pack-1',
          outcome: 'deleted',
        })
      );
    });

    it('records NOTHING on the OWNER branch', async () => {
      grantOnly(AuthorizationPrivilege.DELETE);

      await resolver.deleteInnovationPack(actorContext, {
        ID: 'pack-1',
      } as any);

      expect(resourceAudit().recordEventForActor).not.toHaveBeenCalled();
    });
  });
});

describe('InnovationPackResolverMutations.adminUpdateInnovationPackPromote', () => {
  let module: TestingModule;
  let resolver: InnovationPackResolverMutations;
  let service: InnovationPackService;
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
    }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    module = await Test.createTestingModule({
      providers: [
        InnovationPackResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    resolver = module.get(InnovationPackResolverMutations);
    service = module.get(InnovationPackService);
    authorizationService = module.get(AuthorizationService);
    platformResourceAuditService = module.get(PlatformResourceAuditService);
    vi.mocked(
      module.get(PlatformAuthorizationPolicyService)
        .getPlatformAuthorizationPolicy
    ).mockResolvedValue(platformPolicy);
  });

  it('a PLATFORM_PROMOTE_MANAGE holder sets the flag, gated on the PLATFORM policy (not the resource policy), and it is audited', async () => {
    vi.mocked(service.getInnovationPackOrFail).mockResolvedValue(loaded(false));
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateInnovationPackPromote(
      actorContext,
      {
        innovationPackID: 'res-1',
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
    expect(service.setPromote).toHaveBeenCalledWith('res-1', true);
    expect(service.save).not.toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).toHaveBeenCalledWith(actorContext, A22_INTENDED_OWNERS, {
      resourceKind: 'innovation_pack',
      resourceId: 'res-1',
      promote: true,
      outcome: 'promote_changed',
    });
    expect(result.promote).toBe(true);
  });

  it('a refused caller changes nothing and is not audited', async () => {
    vi.mocked(service.getInnovationPackOrFail).mockResolvedValue(loaded(false));
    vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(
      resolver.adminUpdateInnovationPackPromote(actorContext, {
        innovationPackID: 'res-1',
        promote: true,
      })
    ).rejects.toThrow('forbidden');
    expect(service.setPromote).not.toHaveBeenCalled();
    expect(
      platformResourceAuditService.recordEventForActor
    ).not.toHaveBeenCalled();
  });

  it('re-applying the current value succeeds (idempotent) and is still audited', async () => {
    vi.mocked(service.getInnovationPackOrFail).mockResolvedValue(loaded(true));
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateInnovationPackPromote(
      actorContext,
      {
        innovationPackID: 'res-1',
        promote: true,
      }
    );

    expect(result.promote).toBe(true);
    expect(
      platformResourceAuditService.recordEventForActor
    ).toHaveBeenCalledTimes(1);
    expect(
      platformResourceAuditService.recordEventForActor
    ).toHaveBeenCalledWith(actorContext, A22_INTENDED_OWNERS, {
      resourceKind: 'innovation_pack',
      resourceId: 'res-1',
      promote: true,
      outcome: 'promote_changed',
    });
  });

  it('changes nothing else on the resource and re-applies no authorization', async () => {
    vi.mocked(service.getInnovationPackOrFail).mockResolvedValue(loaded(false));
    vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(true);

    const result = await resolver.adminUpdateInnovationPackPromote(
      actorContext,
      {
        innovationPackID: 'res-1',
        promote: true,
      }
    );

    expect((result as any).listedInStore).toEqual(true);
    expect((result as any).searchVisibility).toEqual('public');
  });
});
