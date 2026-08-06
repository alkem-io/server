import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AdminIdentityResolverMutations } from './admin.identity.resolver.mutations';
import { AdminIdentityService } from './admin.identity.service';

/**
 * 027-platform-role-redesign (T062, A5, T063, T070e) — single-path surface
 * (gated on `identityDeletePolicy`, no self-service branch): both the
 * permitted (with audit write) and denied path.
 */
describe('AdminIdentityResolverMutations', () => {
  let resolver: AdminIdentityResolverMutations;
  let authorizationService: Record<string, Mock>;
  let adminIdentityService: Record<string, Mock>;
  let userLookupService: Record<string, Mock>;
  let platformUserRecordAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminIdentityResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminIdentityResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    adminIdentityService = module.get(AdminIdentityService) as any;
    userLookupService = module.get(UserLookupService) as any;
    platformUserRecordAuditService = module.get(
      PlatformUserRecordAuditService
    ) as any;
  });

  it('permitted: gates on PLATFORM_USERS_ADMIN, deletes the identity and audits the real target user', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userLookupService.getUserByAuthenticationID.mockResolvedValue({
      id: 'user-1',
    });
    adminIdentityService.deleteIdentity.mockResolvedValue(true);

    const result = await resolver.adminIdentityDeleteKratosIdentity(
      actorContext,
      'kratos-1'
    );

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      expect.anything(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      expect.any(String)
    );
    expect(result).toBe(true);
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).toHaveBeenCalledWith(
      actorContext,
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({
        action: 'adminIdentityDeleteKratosIdentity',
        targetUserId: 'user-1',
        kratosIdentityId: 'kratos-1',
        outcome: 'identity_deleted',
      })
    );
  });

  it('denied: propagates the authorization failure without deleting or auditing', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('Forbidden');
    });

    await expect(
      resolver.adminIdentityDeleteKratosIdentity(actorContext, 'kratos-1')
    ).rejects.toThrow('Forbidden');
    expect(adminIdentityService.deleteIdentity).not.toHaveBeenCalled();
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });

  it('does not audit a FAILED identity deletion', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userLookupService.getUserByAuthenticationID.mockResolvedValue({
      id: 'user-1',
    });
    adminIdentityService.deleteIdentity.mockResolvedValue(false);

    const result = await resolver.adminIdentityDeleteKratosIdentity(
      actorContext,
      'kratos-1'
    );

    expect(result).toBe(false);
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });

  // 027-platform-role-redesign (sec-server-4 fix): wires the REAL
  // AuthorizationPolicyService + AuthorizationService so the constructor's
  // `identityDeletePolicy` is a genuine, hardcoded
  // [PLATFORM_USERS_ADMIN, GLOBAL_ADMIN, GLOBAL_PLATFORM_MANAGER] policy —
  // NOT the shared platform policy, whose PLATFORM_USERS_ADMIN grant set
  // additively widens to also admit global-support/global-license-manager
  // (A4's legacy reachers). Asserts those two are denied THIS surface,
  // which they never held pre-feature (PLATFORM_SETTINGS_ADMIN's reach was
  // {GLOBAL_ADMIN, GLOBAL_PLATFORM_MANAGER} only).
  describe('identityDeletePolicy — real-engine integration', () => {
    let realResolver: AdminIdentityResolverMutations;
    let realAdminIdentityService: Record<string, Mock>;

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
          AdminIdentityResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(AdminIdentityResolverMutations);
      realAdminIdentityService = module.get(AdminIdentityService) as any;
      realAdminIdentityService.deleteIdentity.mockResolvedValue(true);
    });

    it('denies a global-support-only actor (never held this surface pre-feature)', async () => {
      const actor = buildActorContext(AuthorizationCredential.PLATFORM_SUPPORT);
      await expect(
        realResolver.adminIdentityDeleteKratosIdentity(actor, 'kratos-1')
      ).rejects.toThrow();
    });

    it('denies a global-license-manager-only actor (never held this surface pre-feature)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_LICENSE_MANAGER
      );
      await expect(
        realResolver.adminIdentityDeleteKratosIdentity(actor, 'kratos-1')
      ).rejects.toThrow();
    });

    // 027-platform-role-redesign (T076, Slice B): INVERTED. This asserted that a
    // legacy credential kept its pre-feature reach through the additive slice.
    // T076 dropped every legacy credential from this surface's grant set, so the
    // assertion becomes the denial — and that denial is the FR-007(d) guarantee
    // itself: the user-record family is held by Platform Users Admin ALONE.
    // Content Full Access is the sharpest case: FR-004 cascades it full CRUD
    // platform-wide, and A5 is outside SC-004's named exception (closed at
    // A6/A7), so it must still be refused here.
    it('DENIES a platform-content-full-access actor — identity deletion is the user-record family', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      await expect(
        realResolver.adminIdentityDeleteKratosIdentity(actor, 'kratos-1')
      ).rejects.toThrow();
    });

    it('allows a platform-users-admin actor (the new owning role)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_USERS_ADMIN
      );
      await expect(
        realResolver.adminIdentityDeleteKratosIdentity(actor, 'kratos-1')
      ).resolves.toBeDefined();
    });
  });
});
