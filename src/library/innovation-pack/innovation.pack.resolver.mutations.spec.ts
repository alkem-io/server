import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackResolverMutations } from './innovation.pack.resolver.mutations';
import { InnovationPackService } from './innovation.pack.service';

describe('InnovationPackResolverMutations', () => {
  let resolver: InnovationPackResolverMutations;
  let innovationPackService: InnovationPackService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
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
});
