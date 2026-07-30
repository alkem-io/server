import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';

/**
 * 027-platform-role-redesign (sec-server-10 fix) — `actorsWithCredential` /
 * `usersWithAuthorizationCredential` previously gated EVERY credential type
 * (including the twelve new `platform-*`/`feature-*` role credentials) on
 * the same blanket `READ_USERS` every registered user holds — a complete
 * bypass of the A20/A20b holder-list gate `role.set.resolver.fields.ts`
 * enforces for the identical data reached a different way.
 */
describe('AdminAuthorizationResolverQueries (sec-server-10 fix)', () => {
  let resolver: AdminAuthorizationResolverQueries;
  let authorizationService: AuthorizationService;
  let platformAuthorizationService: PlatformAuthorizationPolicyService;
  let adminAuthorizationService: AdminAuthorizationService;

  const mockActorContext = { actorID: 'actor-1' } as any;
  const mockPlatformAuth = { id: 'platform-auth' };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminAuthorizationResolverQueries, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminAuthorizationResolverQueries);
    authorizationService = module.get(AuthorizationService);
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    );
    adminAuthorizationService = module.get(AdminAuthorizationService);

    (
      platformAuthorizationService.getPlatformAuthorizationPolicy as Mock
    ).mockResolvedValue(mockPlatformAuth);
    (adminAuthorizationService.actorsWithCredential as Mock).mockResolvedValue(
      []
    );
    (adminAuthorizationService.usersWithCredentials as Mock).mockResolvedValue(
      []
    );
  });

  describe('actorsWithCredential', () => {
    it('keeps the plain READ_USERS gate for an ordinary (non-role-family) credential type', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );

      await resolver.actorsWithCredential(
        CredentialType.GLOBAL_ADMIN,
        undefined,
        mockActorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatformAuth,
        AuthorizationPrivilege.READ_USERS,
        expect.any(String)
      );
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('gates a platform-* role credential on PLATFORM_ROLE_HOLDERS_READ, not READ_USERS', async () => {
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.actorsWithCredential(
          CredentialType.PLATFORM_ROLES_ADMIN,
          undefined,
          mockActorContext
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${AuthorizationCredential.PLATFORM_ROLES_ADMIN}`
      );

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    });

    it('allows a platform-* role credential when PLATFORM_ROLE_HOLDERS_READ is granted', async () => {
      (authorizationService.isAccessGranted as Mock).mockReturnValue(true);

      await expect(
        resolver.actorsWithCredential(
          CredentialType.PLATFORM_ROLES_ADMIN,
          undefined,
          mockActorContext
        )
      ).resolves.toEqual([]);
    });

    it('gates a feature-* role credential on PLATFORM_ROLE_HOLDERS_READ or FEATURE_ROLE_HOLDERS_READ', async () => {
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.actorsWithCredential(
          CredentialType.FEATURE_BETA_TESTER,
          undefined,
          mockActorContext
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} or ${AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ} required to read holders of ${AuthorizationCredential.FEATURE_BETA_TESTER}`
      );
    });
  });

  describe('usersWithAuthorizationCredential', () => {
    it('keeps the plain READ_USERS gate for an ordinary credential type', async () => {
      (authorizationService.grantAccessOrFail as Mock).mockResolvedValue(
        undefined
      );

      await resolver.usersWithAuthorizationCredential(
        { type: AuthorizationCredential.GLOBAL_ADMIN } as any,
        mockActorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockPlatformAuth,
        AuthorizationPrivilege.READ_USERS,
        expect.any(String)
      );
    });

    it('rejects an unprivileged caller enumerating platform-audit-reader holders', async () => {
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.usersWithAuthorizationCredential(
          { type: AuthorizationCredential.PLATFORM_AUDIT_READER } as any,
          mockActorContext
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${AuthorizationCredential.PLATFORM_AUDIT_READER}`
      );

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
    });
  });
});
