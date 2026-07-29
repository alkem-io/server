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

    // 027-platform-role-redesign (ninth `/speckit-analyze` pass, FR-004/
    // SC-004, spec-server-1 fix): the eleventh-pass narrowing this test used
    // to assert was ITSELF reversed by the ninth analyze pass — Content
    // Full Access now holds full CREATE/READ/UPDATE/DELETE, a deliberate,
    // signed-off widening. See `a.row.surfaces.ts`'s A6/A7
    // `acceptedExtraReachers` entries for the accepted SC-004 overlap this
    // creates, and `reachability.spec.ts` for the derivation-level check.
    it('grants platform-content-full-access full CREATE/READ/UPDATE/DELETE + PLATFORM_CONTENT_FULL_ACCESS — never UPDATE_NAMEID, never GLOBAL_SUPPORT', () => {
      const calls = callsFor(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      expect(calls).toHaveLength(1);
      const [privileges, types] = calls[0];

      expect(privileges).toEqual([
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
      ]);
      expect(privileges).toHaveLength(5);
      // UPDATE_NAMEID stays excluded: A17 is owned by no global role
      // (spec row 2, FR-020) — cascading it would hand Content Full Access
      // entity renames the spec explicitly denies it.
      expect(privileges).not.toContain(AuthorizationPrivilege.UPDATE_NAMEID);

      // Slice A additive reach: GLOBAL_ADMIN keeps its pre-existing content
      // cascade through this rule too. GLOBAL_SUPPORT is deliberately
      // ABSENT (sec-server-3/corr-server-2 fix) — unlike GLOBAL_ADMIN, it
      // never held blanket CRUD across the seven root-inheriting trees;
      // adding it here would bypass the per-space
      // `allowPlatformSupportAsAdmin` consent gate for both reads and A8
      // deletions.
      expect(types).toEqual(
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          AuthorizationCredential.GLOBAL_ADMIN,
        ])
      );
      expect(types).not.toContain(AuthorizationCredential.GLOBAL_SUPPORT);
      expect(types).toHaveLength(2);
    });
  });
});
