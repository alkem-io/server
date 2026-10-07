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
  describe('createRootCredentialRules (T072, research D5/D6, FR-007(e))', () => {
    const allCalls = () =>
      vi.mocked(authorizationPolicyService.createCredentialRuleUsingTypesOnly)
        .mock.calls;

    const callsFor = (credential: AuthorizationCredential) =>
      allCalls().filter(([, types]) =>
        (types as AuthorizationCredential[]).includes(credential)
      );

    // 027-platform-role-redesign (T072, Slice B): the god mode is GONE.
    // These two are the feature's headline assertions — the root policy
    // grants exactly one credential rule, and GRANT has left the
    // inheritance root entirely (research D6). A regression here is not a
    // failing test, it is the re-creation of the thing this feature
    // removed, so both assert on the WHOLE call history rather than on a
    // filtered subset that a second rule could hide inside.
    it('builds exactly ONE root credential rule — the god-mode rule is gone', () => {
      // T077 (Slice B): the second assertion used to read
      // `callsFor(GLOBAL_ADMIN)).toHaveLength(0)` — the god-mode rule's
      // credential. `global-admin` no longer exists, so the surviving rule is
      // asserted positively instead: exactly one rule, and it belongs to
      // Content Full Access alone.
      expect(allCalls()).toHaveLength(1);
      expect(
        callsFor(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS)
      ).toHaveLength(1);
    });

    it('grants no GRANT at the inheritance root — no credential can grant by cascade (D6)', () => {
      for (const [privileges] of allCalls()) {
        expect(privileges).not.toContain(AuthorizationPrivilege.GRANT);
      }
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

      // Slice B (T072): the rule's credential list is exactly the owning
      // role. `global-admin` is gone from it, and `global-support` was never
      // in it (sec-server-3/corr-server-2 fix) — it never held blanket CRUD
      // across the seven root-inheriting trees, and adding it would bypass
      // the per-space `allowPlatformSupportAsAdmin` consent gate for both
      // reads and A8 deletions.
      expect(types).toEqual([
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      ]);
    });
  });
});
