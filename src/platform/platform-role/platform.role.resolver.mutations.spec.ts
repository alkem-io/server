import { RoleChangeType } from '@alkemio/notifications-lib';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { PlatformRoleAssignmentAuditService } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock } from 'vitest';
import { PlatformRoleAssignmentRulesService } from './platform.role.assignment.rules.service';
import { PlatformRoleResolverMutations } from './platform.role.resolver.mutations';

describe('PlatformRoleResolverMutations', () => {
  let resolver: PlatformRoleResolverMutations;
  let module: TestingModule;
  let platformService: PlatformService;
  let authorizationService: AuthorizationService;
  let roleSetService: RoleSetService;
  let userLookupService: UserLookupService;
  let actorService: ActorService;
  let accountService: AccountService;
  let accountLicenseService: AccountLicenseService;
  let licenseService: LicenseService;
  let notificationPlatformAdapter: NotificationPlatformAdapter;
  let roleSetAuthorizationService: RoleSetAuthorizationService;
  let logger: LoggerService;

  const mockActorContext = {
    actorID: 'actor-1',
  } as ActorContext;

  const mockRoleSet = {
    id: 'rs-1',
    type: 'platform',
    authorization: { id: 'auth-rs' },
  };

  const mockUser = {
    id: 'user-target',
    accountID: 'account-1',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [PlatformRoleResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformRoleResolverMutations);
    platformService = module.get(PlatformService);
    authorizationService = module.get(AuthorizationService);
    roleSetService = module.get(RoleSetService);
    userLookupService = module.get(UserLookupService);
    actorService = module.get(ActorService);
    accountService = module.get(AccountService);
    accountLicenseService = module.get(AccountLicenseService);
    licenseService = module.get(LicenseService);
    notificationPlatformAdapter = module.get(NotificationPlatformAdapter);
    roleSetAuthorizationService = module.get(RoleSetAuthorizationService);
    logger = module.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  });

  describe('assignPlatformRoleToUser', () => {
    beforeEach(() => {
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.assignActorToRole as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockResolvedValue(undefined);
    });

    it('should assign GLOBAL_ADMIN role with GRANT_GLOBAL_ADMINS privilege, checked against the resolver-local un-widened policy (sec-server-2/corr-server-1 fix), NOT roleSet.authorization', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        expect.anything(),
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        expect.any(String)
      );
      // NOT `mockRoleSet.authorization` — the legacy-role branch is pinned
      // to the resolver-local `legacyGlobalAdminPolicy` so T034's widening
      // of GRANT_GLOBAL_ADMINS on the shared roleSet policy cannot reach it.
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        expect.any(String)
      );
    });

    it('should assign BETA_TESTER role with GRANT privilege and grant license credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_BETA_TESTER,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
          resourceID: 'account-1',
        })
      );
    });

    it('should assign VC_CAMPAIGN role with GRANT privilege and grant license credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_VC_CAMPAIGN,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
    });

    // 027-platform-role-redesign (T040a, T070f): FEATURE_BETA_TESTER is
    // rule-engine-governed (a `feature-*` role), unlike its legacy
    // PLATFORM_BETA_TESTER twin — but it MUST carry the SAME beta/trial
    // license entitlement grant, or the target role is inert once Slice B
    // drops platform-beta-tester (FR-009, SC-007).
    it('grants FEATURE_BETA_TESTER (T040a) the SAME beta/trial license entitlement as legacy PLATFORM_BETA_TESTER', async () => {
      const actorContextWithCredentials = {
        actorID: 'actor-1',
        // A2's intended owners (FEATURE_ROLE_ASSIGN): platform-users-admin
        // or platform-roles-admin — required for FR-025 attribution
        // (resolveA1A2InitiatorRole) to resolve without throwing.
        credentials: [{ type: AuthorizationCredential.PLATFORM_ROLES_ADMIN }],
      } as any;
      const roleData = {
        actorID: 'user-target',
        role: RoleName.FEATURE_BETA_TESTER,
      };

      (actorService.grantCredentialOrFail as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.assignPlatformRoleToUser(
        actorContextWithCredentials,
        roleData as any
      );

      expect(actorService.grantCredentialOrFail).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
          resourceID: 'account-1',
        })
      );
    });

    it('should send global role change notification', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.assignPlatformRoleToUser(
        mockActorContext,
        roleData as any
      );

      expect(
        notificationPlatformAdapter.platformGlobalRoleChanged
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'actor-1',
          userID: 'user-target',
          type: RoleChangeType.ADDED,
          role: RoleName.GLOBAL_ADMIN,
        })
      );
    });

    // The notification is dispatched fire-and-forget, so a rejection that
    // escapes would become an unhandled rejection and — under Node's default
    // `--unhandled-rejections=throw` — take the whole process down rather than
    // fail the request. Notifying is best-effort; it must stay contained.
    it('should contain a notification dispatch failure and log it', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockRejectedValue(
        new TypeError("Cannot read properties of null (reading 'displayName')")
      );

      await expect(
        resolver.assignPlatformRoleToUser(mockActorContext, roleData as any)
      ).resolves.toBe(mockUser);

      await vi.waitFor(() =>
        expect(logger.error).toHaveBeenCalledWith(
          {
            message: 'Notification dispatch failed',
            event: 'platformGlobalRoleChanged',
            error: expect.stringContaining('TypeError'),
          },
          expect.any(String),
          LogContext.NOTIFICATIONS
        )
      );
    });
  });

  describe('removePlatformRoleFromUser', () => {
    beforeEach(() => {
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue(undefined);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockResolvedValue(undefined);
    });

    it('should remove ADMIN role with GRANT_GLOBAL_ADMINS privilege', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        expect.anything(),
        AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
        expect.any(String)
      );
    });

    it('should remove BETA_TESTER role with GRANT privilege and revoke credential', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_BETA_TESTER,
      };

      (
        roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval as Mock
      ).mockReturnValue({ id: 'extended-auth' });
      (actorService.revokeCredential as Mock).mockResolvedValue(undefined);
      (accountService.getAccountOrFail as Mock).mockResolvedValue({
        id: 'account-1',
      });
      (accountLicenseService.applyLicensePolicy as Mock).mockResolvedValue([]);
      (licenseService.saveAll as Mock).mockResolvedValue([]);

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        { id: 'extended-auth' },
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
      expect(actorService.revokeCredential).toHaveBeenCalledWith(
        'account-1',
        expect.objectContaining({
          type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        })
      );
    });

    it('should send REMOVED notification', async () => {
      const roleData = {
        actorID: 'user-target',
        role: RoleName.GLOBAL_ADMIN,
      };

      await resolver.removePlatformRoleFromUser(
        mockActorContext,
        roleData as any
      );

      expect(
        notificationPlatformAdapter.platformGlobalRoleChanged
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RoleChangeType.REMOVED,
        })
      );
    });

    // sec-server-20 (2026-07-31): this surface asserted
    // `targetActorType: 'user'` to the rule engine without ever checking it.
    // The first thing that verified the claim was the `getUserByIdOrFail`
    // at the END of the method — by which point `removeActorFromRole` had
    // already revoked the credential and `recordRevokeSuccess` had filed
    // the row under `subjectUserId`. An organization id therefore produced
    // a real state change, a mis-attributed audit row, AND an error telling
    // the caller nothing happened. The lookup now runs first.
    it('does NOT revoke or audit when the target actor is not a user (sec-server-20)', async () => {
      (userLookupService.getUserByIdOrFail as Mock).mockRejectedValue(
        new Error('User not found')
      );

      await expect(
        resolver.removePlatformRoleFromUser(mockActorContext, {
          actorID: 'organization-1',
          role: RoleName.PLATFORM_SUPPORT,
        } as any)
      ).rejects.toBeDefined();

      expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
      expect(
        (module.get(PlatformRoleAssignmentAuditService) as any)
          .recordRevokeSuccess
      ).not.toHaveBeenCalled();
    });
  });

  // 027-platform-role-redesign (T010/fix — live-verification F-1): the
  // suite above auto-mocks `PlatformRoleAssignmentRulesService`, so it can
  // never catch a wiring defect between the resolver and the REAL rule
  // engine. This block wires the REAL rules service (only its
  // `AuthorizationService` dependency is stubbed) so rule 5's revoke-path
  // integration is actually exercised end to end, not just asserted in
  // isolation (rules.service.spec.ts) or mocked away (suite above).
  describe('removePlatformRoleFromUser — rule 5 real-engine integration', () => {
    let realResolver: PlatformRoleResolverMutations;
    let realRoleSetService: RoleSetService;
    let realAuthorizationService: AuthorizationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlatformRoleResolverMutations,
          PlatformRoleAssignmentRulesService,
          MockWinstonProvider,
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(PlatformRoleResolverMutations);
      realRoleSetService = module.get(RoleSetService);
      realAuthorizationService = module.get(AuthorizationService);

      (module.get(PlatformService).getRoleSetOrFail as Mock).mockResolvedValue(
        mockRoleSet
      );
      (realAuthorizationService.isAccessGranted as Mock).mockReturnValue(true);
      (realRoleSetService.removeActorFromRole as Mock).mockResolvedValue(
        undefined
      );
      (
        module.get(UserLookupService).getUserByIdOrFail as Mock
      ).mockResolvedValue(mockUser);
    });

    it('rejects revoking PLATFORM_ROLES_ADMIN from the sole holder', async () => {
      (realRoleSetService.countActorsWithRole as Mock).mockResolvedValue(1);

      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_ROLES_ADMIN,
      };

      await expect(
        realResolver.removePlatformRoleFromUser(
          mockActorContext,
          roleData as any
        )
      ).rejects.toThrow('cannot remove the last platform-roles-admin');

      expect(realRoleSetService.removeActorFromRole).not.toHaveBeenCalled();
    });

    it('allows revoking PLATFORM_ROLES_ADMIN when another holder remains', async () => {
      (realRoleSetService.countActorsWithRole as Mock).mockResolvedValue(2);

      const actorContextWithCredentials = {
        actorID: 'actor-1',
        credentials: [{ type: AuthorizationCredential.PLATFORM_ROLES_ADMIN }],
      } as any;
      const roleData = {
        actorID: 'user-target',
        role: RoleName.PLATFORM_ROLES_ADMIN,
      };

      await realResolver.removePlatformRoleFromUser(
        actorContextWithCredentials,
        roleData as any
      );

      expect(realRoleSetService.removeActorFromRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.PLATFORM_ROLES_ADMIN,
        'user-target'
      );
    });
  });

  // 027-platform-role-redesign (corr-server-17/spec-server-18 fix): the
  // rule-1 precheck (`hasAnyAssignerCapability`) MUST distinguish a genuinely
  // unprivileged probe (no assignment capability of ANY kind) from a
  // PRIVILEGED actor attempting a cross-family escalation (e.g. a Platform
  // Users Admin — holding ONLY `FEATURE_ROLE_ASSIGN` — targeting a
  // `platform-*` role, which requires `GRANT_GLOBAL_ADMINS`). Only the first
  // is exempt from the rejection-audit write. Wires the REAL rules service
  // with a privilege-discriminating `AuthorizationService.isAccessGranted`
  // mock — the suite above auto-mocks the rules service and therefore never
  // reaches the real precheck body.
  describe('assignPlatformRoleToUser — rule-1 precheck audit coverage (corr-server-17/spec-server-18)', () => {
    const buildRealModule = async (
      grantedPrivileges: ReadonlySet<AuthorizationPrivilege>
    ) => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlatformRoleResolverMutations,
          PlatformRoleAssignmentRulesService,
          MockWinstonProvider,
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      const realResolver = module.get(PlatformRoleResolverMutations);
      const realAuthorizationService = module.get(AuthorizationService);
      const realRoleAssignmentAuditService = module.get(
        PlatformRoleAssignmentAuditService
      );
      const realRoleSetService = module.get(RoleSetService);

      (module.get(PlatformService).getRoleSetOrFail as Mock).mockResolvedValue(
        mockRoleSet
      );
      (realAuthorizationService.isAccessGranted as Mock).mockImplementation(
        (
          _actor: unknown,
          _policy: unknown,
          privilege: AuthorizationPrivilege
        ) => grantedPrivileges.has(privilege)
      );
      (
        module.get(UserLookupService).getUserByIdOrFail as Mock
      ).mockResolvedValue(mockUser);
      (
        realRoleAssignmentAuditService.recordGrantRejected as Mock
      ).mockResolvedValue(undefined);

      return {
        realResolver,
        realRoleAssignmentAuditService,
        realRoleSetService,
      };
    };

    it('audits a Platform Users Admin (FEATURE_ROLE_ASSIGN only) attempting to grant a platform-* role — a cross-family escalation, NOT a probe', async () => {
      const {
        realResolver,
        realRoleAssignmentAuditService,
        realRoleSetService,
      } = await buildRealModule(
        new Set([AuthorizationPrivilege.FEATURE_ROLE_ASSIGN])
      );

      await expect(
        realResolver.assignPlatformRoleToUser(mockActorContext, {
          actorID: 'user-target',
          role: RoleName.PLATFORM_ROLES_ADMIN,
        } as any)
      ).rejects.toThrow(
        'Forbidden: grant-global-admins required to assign role platform-roles-admin'
      );

      expect(
        realRoleAssignmentAuditService.recordGrantRejected
      ).toHaveBeenCalledTimes(1);
      expect(
        realRoleAssignmentAuditService.recordGrantRejected
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          targetKind: 'user',
          targetId: 'user-target',
          role: RoleName.PLATFORM_ROLES_ADMIN,
          rejectedRule: expect.stringContaining(
            'grant-global-admins required to assign role'
          ),
        })
      );
      expect(realRoleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('does NOT audit a fully unprivileged caller (holds neither GRANT_GLOBAL_ADMINS nor FEATURE_ROLE_ASSIGN) — a genuine probe', async () => {
      const {
        realResolver,
        realRoleAssignmentAuditService,
        realRoleSetService,
      } = await buildRealModule(new Set());

      await expect(
        realResolver.assignPlatformRoleToUser(mockActorContext, {
          actorID: 'user-target',
          role: RoleName.PLATFORM_ROLES_ADMIN,
        } as any)
      ).rejects.toThrow(
        'Forbidden: grant-global-admins required to assign role platform-roles-admin'
      );

      expect(
        realRoleAssignmentAuditService.recordGrantRejected
      ).not.toHaveBeenCalled();
      expect(realRoleSetService.assignActorToRole).not.toHaveBeenCalled();
    });
  });

  // 027-platform-role-redesign (sec-server-2/corr-server-1 fix): wires the
  // REAL AuthorizationPolicyService + AuthorizationService so the
  // constructor's `legacyGlobalAdminPolicy` is a genuine, hardcoded
  // `[GLOBAL_ADMIN]` IAuthorizationPolicy — not an auto-mocked stand-in —
  // and asserts a `platform-roles-admin`-only actor (T034's WIDENED
  // GRANT_GLOBAL_ADMINS holder) is denied the legacy `global-admin` grant,
  // mirroring the FR-022 pin suite in
  // `admin.authorization.resolver.mutations.spec.ts`.
  describe('legacy-role branch pin: assign/removePlatformRoleFrom{User} stay global-admin-only in Slice A', () => {
    let realResolver: PlatformRoleResolverMutations;

    const buildActorContext = (
      credentialType: AuthorizationCredential
    ): ActorContext =>
      ({
        actorID: 'actor-1',
        credentials: [{ type: credentialType, resourceID: '' }],
      }) as any as ActorContext;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlatformRoleResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
          {
            provide: getEntityManagerToken('default'),
            useValue: { find: vi.fn() },
          },
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(PlatformRoleResolverMutations);
      (module.get(PlatformService).getRoleSetOrFail as Mock).mockResolvedValue(
        mockRoleSet
      );
    });

    it('denies assignPlatformRoleToUser(global-admin) to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.assignPlatformRoleToUser(actor, {
          actorID: 'user-target',
          role: RoleName.GLOBAL_ADMIN,
        } as any)
      ).rejects.toThrow();
    });

    it('denies removePlatformRoleFromUser(global-admin) to a platform-roles-admin-only actor', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_ROLES_ADMIN
      );
      await expect(
        realResolver.removePlatformRoleFromUser(actor, {
          actorID: 'user-target',
          role: RoleName.GLOBAL_ADMIN,
        } as any)
      ).rejects.toThrow();
    });

    it('allows assignPlatformRoleToUser(global-admin) to an actor holding the legacy global-admin credential', async () => {
      const actor = buildActorContext(AuthorizationCredential.GLOBAL_ADMIN);

      await expect(
        realResolver.assignPlatformRoleToUser(actor, {
          actorID: 'user-target',
          role: RoleName.GLOBAL_ADMIN,
        } as any)
      ).resolves.toBeDefined();
    });
  });

  // 027-platform-role-redesign (qual-server-4 fix): `assertOrganizationSurfaceOrFail`
  // — the round-2 fix for sec-server-6 (legacy-role escalation via the
  // organization surface) and sec-server-8 (user-id through the
  // organization surface) — previously had ZERO test coverage despite
  // `A_ROW_GATE_COVERAGE.A2` declaring this file as its covering gate spec.
  describe('organization-target surface guard (assertOrganizationSurfaceOrFail)', () => {
    let actorLookupService: ActorLookupService;
    let roleAssignmentAuditService: PlatformRoleAssignmentAuditService;

    beforeEach(() => {
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      actorLookupService = module.get(ActorLookupService);
      roleAssignmentAuditService = module.get(
        PlatformRoleAssignmentAuditService
      );
      // corr-server-19: the guard now opens with the sec-server-11 probe, so
      // every test BELOW — each about a PRIVILEGED actor being rejected for
      // a holder-kind reason — must first get past it. Without this they
      // would be rejected one step earlier, for a different reason, and
      // would silently stop testing what they were written to test.
      (
        module.get(PlatformRoleAssignmentRulesService)
          .hasAnyAssignerCapability as Mock
      ).mockReturnValue(true);
    });

    // corr-server-19 (2026-07-31). This guard WRITES an audit row before
    // throwing, and it ran ahead of every assigner-capability check — so an
    // unprivileged caller could drive one attacker-chosen
    // `platform_audit_entry` INSERT per request. The probe must reject
    // BEFORE the writer is reached, which is what these two assert.
    describe('unprivileged probe rejection (corr-server-19)', () => {
      beforeEach(() => {
        (
          module.get(PlatformRoleAssignmentRulesService)
            .hasAnyAssignerCapability as Mock
        ).mockReturnValue(false);
        // Auto-mocked, so it returns an object that breaks the message's
        // template interpolation — give it the real privilege name.
        (
          module.get(PlatformRoleAssignmentRulesService)
            .assignerPrivilegeFor as Mock
        ).mockReturnValue('grant-global-admins');
      });

      it('assign: rejects an actor with NO assigner capability, writing NO audit row', async () => {
        await expect(
          resolver.assignPlatformRoleToOrganization(mockActorContext, {
            actorID: 'org-target',
            role: RoleName.PLATFORM_ROLES_ADMIN,
          } as any)
        ).rejects.toThrow(/required to assign role/);

        expect(
          roleAssignmentAuditService.recordGrantRejected
        ).not.toHaveBeenCalled();
      });

      it('revoke: same probe on the removal surface, writing NO audit row', async () => {
        await expect(
          resolver.removePlatformRoleFromOrganization(mockActorContext, {
            actorID: 'org-target',
            role: RoleName.PLATFORM_ROLES_ADMIN,
          } as any)
        ).rejects.toThrow(/required to assign role/);

        expect(
          roleAssignmentAuditService.recordGrantRejected
        ).not.toHaveBeenCalled();
      });

      it('a PRIVILEGED cross-family attempt is NOT treated as a probe — it still audits', async () => {
        (
          module.get(PlatformRoleAssignmentRulesService)
            .hasAnyAssignerCapability as Mock
        ).mockReturnValue(true);

        await expect(
          resolver.assignPlatformRoleToOrganization(mockActorContext, {
            actorID: 'org-target',
            role: RoleName.PLATFORM_ROLES_ADMIN,
          } as any)
        ).rejects.toThrow(
          'may not be assigned or removed through the organization surface'
        );

        expect(
          roleAssignmentAuditService.recordGrantRejected
        ).toHaveBeenCalled();
      });
    });

    it('rejects assignPlatformRoleToOrganization(global-admin) with the contract message, and never touches assignActorToRole or any audit writer', async () => {
      await expect(
        resolver.assignPlatformRoleToOrganization(mockActorContext, {
          actorID: 'org-target',
          role: RoleName.GLOBAL_ADMIN,
        } as any)
      ).rejects.toThrow(
        'Rejected: role global-admin may not be assigned or removed through the organization surface'
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      expect(actorLookupService.getActorTypeByIdOrFail).not.toHaveBeenCalled();
    });

    it('rejects removePlatformRoleFromOrganization(platform-roles-admin — a PLATFORM_FAMILY_ROLES member) through the same guard', async () => {
      await expect(
        resolver.removePlatformRoleFromOrganization(mockActorContext, {
          actorID: 'org-target',
          role: RoleName.PLATFORM_ROLES_ADMIN,
        } as any)
      ).rejects.toThrow(
        'Rejected: role platform-roles-admin may not be assigned or removed through the organization surface'
      );

      expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
    });

    it('rejects a FEATURE_FAMILY_ROLES grant when the target actor does not resolve to an organization, before assignActorToRole', async () => {
      (actorLookupService.getActorTypeByIdOrFail as Mock).mockResolvedValue(
        ActorType.USER
      );

      await expect(
        resolver.assignPlatformRoleToOrganization(mockActorContext, {
          actorID: 'user-not-org',
          role: RoleName.FEATURE_BETA_TESTER,
        } as any)
      ).rejects.toThrow(
        'Rejected: target actor for role feature-beta-tester is not an organization'
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('writes a role_grant_rejected audit row for the holder-kind rejection (corr-server-15 fix)', async () => {
      await expect(
        resolver.assignPlatformRoleToOrganization(mockActorContext, {
          actorID: 'org-target',
          role: RoleName.GLOBAL_ADMIN,
        } as any)
      ).rejects.toThrow();

      expect(
        roleAssignmentAuditService.recordGrantRejected
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          targetKind: 'organization',
          targetId: 'org-target',
          role: RoleName.GLOBAL_ADMIN,
          rejectedRule: expect.stringContaining(
            'may not be assigned or removed through the organization surface'
          ),
        })
      );
    });
  });
  // ===================================================================
  // qual-server-11 (2026-07-31) — FR-027's fail-closed compensation.
  //
  // `recordGrantSuccess` / `recordRevokeSuccess` run AFTER the state change
  // has landed. If the success-audit write throws, the caller is told the
  // operation was NOT applied — so the resolver must undo it, or the caller's
  // belief and the platform's state disagree with each other AND with the
  // (absent) trail. corr-server-14 then added the inverse hazard: when the
  // operation was an idempotent NO-OP, compensating would mutate state the
  // mutation never touched (revoking a pre-existing grant / granting a role
  // nobody asked for).
  //
  // Both branches had ZERO coverage, in this file or anywhere else: nothing
  // would have noticed either the compensation OR the no-op guard being
  // deleted outright. These eight tests pin the full truth table.
  // ===================================================================
  describe('success-audit compensation (qual-server-11, FR-027/corr-server-14)', () => {
    const RULE_ENGINE_ROLE = RoleName.PLATFORM_SUPPORT;
    const auditFailure = new Error('audit write failed');

    // The rule engine is auto-mocked in this suite, so its two entry points
    // must be steered explicitly: `hasAnyAssignerCapability` false would trip
    // the sec-server-11 probe before the compensation path is ever reached.
    // The actor needs real credentials because `resolveA1A2InitiatorRole`
    // maps over them to attribute the audit row.
    const compensationActorContext = {
      actorID: 'actor-1',
      credentials: [
        { type: AuthorizationCredential.PLATFORM_ROLES_ADMIN, resourceID: '' },
      ],
    } as unknown as ActorContext;

    const arrange = (opts: { heldBefore: boolean; auditThrows: boolean }) => {
      const audit = module.get(PlatformRoleAssignmentAuditService) as any;
      const rules = module.get(PlatformRoleAssignmentRulesService) as any;
      rules.hasAnyAssignerCapability.mockReturnValue(true);
      rules.evaluateOrFail.mockReturnValue(undefined);
      (platformService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue(mockUser);
      (roleSetService.assignActorToRole as Mock).mockResolvedValue(undefined);
      (roleSetService.removeActorFromRole as Mock).mockResolvedValue(undefined);
      (roleSetService.isInRole as Mock).mockResolvedValue(opts.heldBefore);
      (
        notificationPlatformAdapter.platformGlobalRoleChanged as Mock
      ).mockResolvedValue(undefined);
      audit.recordGrantOrRevoke.mockImplementation(() =>
        opts.auditThrows ? Promise.reject(auditFailure) : Promise.resolve()
      );
      return audit;
    };

    const roleData = { actorID: 'user-target', role: RULE_ENGINE_ROLE } as any;

    describe('grant side', () => {
      it('COMPENSATES a real grant by revoking it, and still rethrows', async () => {
        arrange({ heldBefore: false, auditThrows: true });

        await expect(
          resolver.assignPlatformRoleToUser(compensationActorContext, roleData)
        ).rejects.toBe(auditFailure);

        expect(roleSetService.removeActorFromRole).toHaveBeenCalledWith(
          mockRoleSet,
          RULE_ENGINE_ROLE,
          'user-target'
        );
      });

      it('does NOT compensate a NO-OP grant — that would revoke a pre-existing role (corr-server-14)', async () => {
        arrange({ heldBefore: true, auditThrows: true });

        await expect(
          resolver.assignPlatformRoleToUser(compensationActorContext, roleData)
        ).rejects.toBe(auditFailure);

        expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
      });

      it('rethrows the ORIGINAL audit error even when compensation itself fails', async () => {
        arrange({ heldBefore: false, auditThrows: true });
        (roleSetService.removeActorFromRole as Mock).mockRejectedValue(
          new Error('compensation exploded')
        );

        await expect(
          resolver.assignPlatformRoleToUser(compensationActorContext, roleData)
        ).rejects.toBe(auditFailure);
      });

      it('compensates nothing when the audit write succeeds', async () => {
        arrange({ heldBefore: false, auditThrows: false });

        await resolver.assignPlatformRoleToUser(
          compensationActorContext,
          roleData
        );

        expect(roleSetService.removeActorFromRole).not.toHaveBeenCalled();
      });
    });

    describe('revoke side', () => {
      it('COMPENSATES a real revoke by re-granting it, and still rethrows', async () => {
        arrange({ heldBefore: true, auditThrows: true });

        await expect(
          resolver.removePlatformRoleFromUser(
            compensationActorContext,
            roleData
          )
        ).rejects.toBe(auditFailure);

        expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
          mockRoleSet,
          RULE_ENGINE_ROLE,
          'user-target',
          compensationActorContext,
          true
        );
      });

      it('does NOT compensate a NO-OP revoke — that would grant a role nobody asked for (corr-server-14)', async () => {
        arrange({ heldBefore: false, auditThrows: true });

        await expect(
          resolver.removePlatformRoleFromUser(
            compensationActorContext,
            roleData
          )
        ).rejects.toBe(auditFailure);

        expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      });

      it('rethrows the ORIGINAL audit error even when compensation itself fails', async () => {
        arrange({ heldBefore: true, auditThrows: true });
        (roleSetService.assignActorToRole as Mock).mockRejectedValue(
          new Error('compensation exploded')
        );

        await expect(
          resolver.removePlatformRoleFromUser(
            compensationActorContext,
            roleData
          )
        ).rejects.toBe(auditFailure);
      });

      it('compensates nothing when the audit write succeeds', async () => {
        arrange({ heldBefore: true, auditThrows: false });

        await resolver.removePlatformRoleFromUser(
          compensationActorContext,
          roleData
        );

        expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
      });
    });
  });
});
