import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';

describe('PlatformAuthorizationPolicyService', () => {
  let service: PlatformAuthorizationPolicyService;
  let platformRepository: MockType<Repository<Platform>>;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthorizationPolicyService,
        repositoryProviderMockFactory(Platform),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformAuthorizationPolicyService);
    platformRepository = module.get(getRepositoryToken(Platform));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPlatformAuthorizationPolicy', () => {
    it('should return the authorization policy when platform is found', async () => {
      const authPolicy = { id: 'auth-1' } as IAuthorizationPolicy;
      const platform = { authorization: authPolicy } as Platform;
      platformRepository.findOne!.mockResolvedValue(platform);

      const result = await service.getPlatformAuthorizationPolicy();

      expect(result).toBe(authPolicy);
    });

    it('should throw EntityNotFoundException when platform is not found', async () => {
      platformRepository.findOne!.mockResolvedValue(null);

      await expect(service.getPlatformAuthorizationPolicy()).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when platform has no authorization', async () => {
      const platform = { authorization: undefined } as unknown as Platform;
      platformRepository.findOne!.mockResolvedValue(platform);

      await expect(service.getPlatformAuthorizationPolicy()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('inheritRootAuthorizationPolicy', () => {
    it('should delegate to authorizationPolicyService.inheritParentAuthorization with child auth', () => {
      const childAuth = { id: 'child-1' } as IAuthorizationPolicy;
      const expectedResult = { id: 'inherited-1' } as IAuthorizationPolicy;
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(expectedResult);

      const result = service.inheritRootAuthorizationPolicy(childAuth);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(childAuth, expect.anything());
      expect(result).toBe(expectedResult);
    });

    it('should handle undefined child authorization', () => {
      const expectedResult = { id: 'inherited-2' } as IAuthorizationPolicy;
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(expectedResult);

      const result = service.inheritRootAuthorizationPolicy(undefined);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(undefined, expect.anything());
      expect(result).toBe(expectedResult);
    });
  });

  // 027-platform-role-redesign (T070f): the root credential rules are built
  // once, in the constructor (createRootAuthorizationPolicy ->
  // createRootCredentialRules), via createCredentialRuleUsingTypesOnly on
  // the auto-mocked AuthorizationPolicyService. The two calls it makes are
  // captured on the mock's call history before this describe block ever
  // runs a test — vi.restoreAllMocks() in the outer beforeEach happens
  // BEFORE the module (and therefore the service) is constructed, so the
  // history is fresh and belongs entirely to this instantiation.
  describe('createRootCredentialRules (T036, research D5/D6, FR-007(e))', () => {
    const callsFor = (credential: AuthorizationCredential) =>
      vi
        .mocked(authorizationPolicyService.createCredentialRuleUsingTypesOnly)
        .mock.calls.filter(([, types]) =>
          (types as AuthorizationCredential[]).includes(credential)
        );

    it('grants GLOBAL_ADMIN the untouched CRUD+GRANT god-mode rule, unchanged by this feature', () => {
      const calls = callsFor(AuthorizationCredential.GLOBAL_ADMIN).filter(
        ([privileges]) =>
          (privileges as AuthorizationPrivilege[]).includes(
            AuthorizationPrivilege.GRANT
          )
      );
      expect(calls).toHaveLength(1);
      const [privileges, types] = calls[0];
      expect(privileges).toEqual([
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ]);
      expect(types).toEqual([AuthorizationCredential.GLOBAL_ADMIN]);
    });

    it('grants platform-content-full-access EXACTLY [READ, PLATFORM_CONTENT_FULL_ACCESS] — length 2, never CREATE/UPDATE/DELETE/UPDATE_NAMEID', () => {
      const calls = callsFor(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(calls).toHaveLength(1);
      const [privileges, types] = calls[0];

      // The direct guard T070f asks for: a re-added write privilege here
      // would silently re-open A6's and A7's owner branch (D5), and a
      // re-added UPDATE_NAMEID would hand Content Full Access the entity
      // renames spec row 2 denies it (A17). reachability.spec.ts (T070m)
      // covers this indirectly via set equality; this is the direct,
      // literal-array assertion.
      expect(privileges).toEqual([
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
      ]);
      expect(privileges).toHaveLength(2);
      expect(privileges).not.toContain(AuthorizationPrivilege.CREATE);
      expect(privileges).not.toContain(AuthorizationPrivilege.UPDATE);
      expect(privileges).not.toContain(AuthorizationPrivilege.DELETE);
      expect(privileges).not.toContain(AuthorizationPrivilege.UPDATE_NAMEID);

      // Slice A additive reach: the rule is shared with the two legacy
      // credentials that hold the content cascade today (T036) — they keep
      // their own separate CRUD rule until Slice B (T076).
      expect(types).toEqual(
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ])
      );
      expect(types).toHaveLength(3);
    });
  });
});
