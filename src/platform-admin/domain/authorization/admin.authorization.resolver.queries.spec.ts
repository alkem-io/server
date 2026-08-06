import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CredentialType } from '@common/enums/credential.type';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { PlatformService } from '@platform/platform/platform.service';
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

      // T077: the fixture was `global-admin` — an "ordinary" credential before
      // this feature, a role-family one after, which takes the sec-server-10
      // holder-read branch instead of the plain READ_USERS one.
      await resolver.actorsWithCredential(
        CredentialType.ORGANIZATION_ADMIN,
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
        { type: AuthorizationCredential.ORGANIZATION_ADMIN } as any,
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

  // 027-platform-role-redesign (corr-server-16 fix): the suite above mocks
  // `AuthorizationService.isAccessGranted` directly, so it can never catch a
  // wrong-POLICY-OBJECT regression — only a wrong-boolean one. This block
  // wires a REAL `AuthorizationService` against two DISTINCT, hand-built
  // policies: `platformEntityPolicy` (mirrors the real platform entity's
  // policy — carries NO `PLATFORM_ROLE_HOLDERS_READ`/`FEATURE_ROLE_HOLDERS_READ`
  // rule, exactly as production's `platform.authorization.policy.service.ts`
  // builds it) and `roleSetPolicyWithHolderListRule` (mirrors the platform
  // ROLE-SET's policy, which `createAdditionalRoleSetCredentialRules` is the
  // ONLY place that grants those two privileges). If the resolver ever
  // regresses to checking `platformAuthorization` instead of
  // `roleSet.authorization`, every case below flips from resolving to
  // throwing — an unsatisfiable-gate regression a mocked `isAccessGranted`
  // cannot detect.
  describe('real-policy pin: holder-list gate MUST run against roleSet.authorization, not the platform entity policy (corr-server-16)', () => {
    let realResolver: AdminAuthorizationResolverQueries;
    let realPlatformService: Record<string, Mock>;
    let realPlatformAuthorizationService: Record<string, Mock>;

    const platformRolesAdminActor = {
      actorID: 'actor-1',
      credentials: [
        { type: AuthorizationCredential.PLATFORM_ROLES_ADMIN, resourceID: '' },
      ],
    } as any;

    const noCredentialsActor = {
      actorID: 'actor-2',
      credentials: [],
    } as any;

    beforeEach(async () => {
      // Mirrors production: NO holder-list rule on the platform entity's own
      // policy — the bug was checking exactly this object.
      const platformEntityPolicy = new AuthorizationPolicy(
        AuthorizationPolicyType.IN_MEMORY
      );

      // Mirrors production: the platform ROLE-SET's policy carries the
      // PLATFORM_ROLE_HOLDERS_READ grant for platform-roles-admin holders
      // (createAdditionalRoleSetCredentialRules).
      const roleSetPolicyWithHolderListRule = new AuthorizationPolicy(
        AuthorizationPolicyType.IN_MEMORY
      );
      roleSetPolicyWithHolderListRule.credentialRules = [
        new AuthorizationPolicyRuleCredential(
          [AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ],
          [
            {
              type: AuthorizationCredential.PLATFORM_ROLES_ADMIN,
              resourceID: '',
            },
          ],
          'corr-server-16-pin'
        ),
      ];

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminAuthorizationResolverQueries,
          AuthorizationService,
          MockWinstonProvider,
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(AdminAuthorizationResolverQueries);
      realPlatformService = module.get(PlatformService) as any;
      realPlatformAuthorizationService = module.get(
        PlatformAuthorizationPolicyService
      ) as any;

      realPlatformService.getRoleSetOrFail.mockResolvedValue({
        authorization: roleSetPolicyWithHolderListRule,
      });
      realPlatformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformEntityPolicy
      );
    });

    it('grants a platform-roles-admin holder read access to platform-roles-admin holders (checked against roleSet.authorization)', async () => {
      await expect(
        realResolver.actorsWithCredential(
          CredentialType.PLATFORM_ROLES_ADMIN,
          undefined,
          platformRolesAdminActor
        )
      ).resolves.toBeDefined();
    });

    it('denies a credential-less actor read access to platform-roles-admin holders', async () => {
      await expect(
        realResolver.actorsWithCredential(
          CredentialType.PLATFORM_ROLES_ADMIN,
          undefined,
          noCredentialsActor
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${AuthorizationCredential.PLATFORM_ROLES_ADMIN}`
      );
    });

    it('same pin for usersWithAuthorizationCredential', async () => {
      await expect(
        realResolver.usersWithAuthorizationCredential(
          { type: AuthorizationCredential.PLATFORM_ROLES_ADMIN } as any,
          platformRolesAdminActor
        )
      ).resolves.toBeDefined();
    });
  });
});
