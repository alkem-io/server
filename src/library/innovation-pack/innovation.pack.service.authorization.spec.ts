import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';
import { InnovationPackAuthorizationService } from './innovation.pack.service.authorization';

describe('InnovationPackAuthorizationService', () => {
  let service: InnovationPackAuthorizationService;
  let innovationPackService: InnovationPackService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let templatesSetAuthorizationService: TemplatesSetAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPackAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InnovationPackAuthorizationService);
    innovationPackService = module.get(InnovationPackService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    templatesSetAuthorizationService = module.get(
      TemplatesSetAuthorizationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization policy and return updated authorizations', async () => {
      const authorization = { id: 'auth-1' };
      const profile = { id: 'profile-1' };
      const templatesSet = { id: 'ts-1' };
      const pack = {
        id: 'pack-1',
        profile,
        templatesSet,
        authorization,
      } as unknown as IInnovationPack;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        authorization as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(authorization as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization as any);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'profile-auth' } as any]);
      vi.mocked(
        templatesSetAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'ts-auth' } as any]);

      const parentAuth = { id: 'parent-auth' } as any;
      const result = await service.applyAuthorizationPolicy(pack, parentAuth);

      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        authorization
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(authorization, parentAuth);
      expect(result).toHaveLength(3);
    });

    // QA server-C2-c (ruling (a)): A7 — Platform Support edits an org-owned
    // pack. Its PLATFORM_SUPPORT_ORG_RESOURCES (cascaded from the org-hosted
    // account) is mapped to UPDATE/CREATE/FILE_UPLOAD — never DELETE — on the
    // pack's profile subtree, threaded down from HERE only.
    it('QA server-C2-c: threads the PLATFORM_SUPPORT_ORG_RESOURCES → UPDATE/CREATE/FILE_UPLOAD privilege rule (never DELETE) into the pack profile', async () => {
      const authorization = { id: 'auth-1' };
      const pack = {
        id: 'pack-1',
        profile: { id: 'profile-1' },
        templatesSet: { id: 'ts-1' },
        authorization,
      } as unknown as IInnovationPack;
      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        authorization as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(authorization as any);
      vi.mocked(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).mockReturnValue(authorization as any);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        templatesSetAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(pack, { id: 'parent' } as any);

      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        'profile-1',
        authorization,
        [],
        [
          expect.objectContaining({
            sourcePrivilege:
              AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES,
            grantedPrivileges: [
              AuthorizationPrivilege.UPDATE,
              AuthorizationPrivilege.CREATE,
              AuthorizationPrivilege.FILE_UPLOAD,
            ],
          }),
        ]
      );
      const rule = vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mock.calls[0][3]![0];
      expect(rule.grantedPrivileges).not.toContain(
        AuthorizationPrivilege.DELETE
      );
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const pack = {
        id: 'pack-1',
        profile: undefined,
        templatesSet: { id: 'ts-1' },
        authorization: { id: 'auth-1' },
      } as unknown as IInnovationPack;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);

      await expect(
        service.applyAuthorizationPolicy(pack, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when templatesSet is missing', async () => {
      const pack = {
        id: 'pack-1',
        profile: { id: 'profile-1' },
        templatesSet: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as IInnovationPack;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);

      await expect(
        service.applyAuthorizationPolicy(pack, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw EntityNotInitializedException when authorization is missing on pack', async () => {
      const profile = { id: 'profile-1' };
      const templatesSet = { id: 'ts-1' };
      const pack = {
        id: 'pack-1',
        profile,
        templatesSet,
        authorization: undefined,
      } as unknown as IInnovationPack;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(pack);
      vi.mocked(authorizationPolicyService.reset).mockReturnValue(
        undefined as any
      );
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(undefined as any);

      await expect(
        service.applyAuthorizationPolicy(pack, undefined)
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});
