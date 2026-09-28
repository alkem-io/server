import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UserIdentityDeletionException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserService } from '@domain/community/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AdminUsersMutations } from './admin.users.resolver.mutations';

/**
 * 027-platform-role-redesign (T062, A5, T063) — single-path surface (gated
 * on `accountDeletePolicy`, no self-service branch): both the permitted
 * (with audit write) and denied path.
 */
describe('AdminUsersMutations', () => {
  let resolver: AdminUsersMutations;
  let authorizationService: Record<string, Mock>;
  let userService: Record<string, Mock>;
  let kratosService: Record<string, Mock>;
  let platformUserRecordAuditService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUsersMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminUsersMutations);
    authorizationService = module.get(AuthorizationService) as any;
    userService = module.get(UserService) as any;
    kratosService = module.get(KratosService) as any;
    platformUserRecordAuditService = module.get(
      PlatformUserRecordAuditService
    ) as any;
  });

  it('permitted: gates on PLATFORM_USERS_ADMIN, deletes the Kratos account and audits', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userService.getUserByIdOrFail.mockResolvedValue({
      id: 'user-1',
      email: 'user1@example.com',
    });
    kratosService.deleteIdentityByEmail.mockResolvedValue(undefined);
    userService.clearAuthenticationIDForUser.mockResolvedValue({
      id: 'user-1',
    });

    const result = await resolver.adminUserAccountDelete(
      actorContext,
      'user-1'
    );

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      expect.anything(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      expect.any(String)
    );
    expect(result).toEqual({ id: 'user-1' });
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).toHaveBeenCalledWith(
      actorContext,
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({
        action: 'adminUserAccountDelete',
        targetUserId: 'user-1',
        outcome: 'account_reset',
      })
    );
  });

  it('denied: propagates the authorization failure without deleting or auditing', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('Forbidden');
    });

    await expect(
      resolver.adminUserAccountDelete(actorContext, 'user-1')
    ).rejects.toThrow('Forbidden');
    expect(kratosService.deleteIdentityByEmail).not.toHaveBeenCalled();
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });

  it('wraps a Kratos deletion failure in UserIdentityDeletionException and does not audit', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userService.getUserByIdOrFail.mockResolvedValue({
      id: 'user-1',
      email: 'user1@example.com',
    });
    kratosService.deleteIdentityByEmail.mockRejectedValue(
      new Error('kratos unavailable')
    );

    await expect(
      resolver.adminUserAccountDelete(actorContext, 'user-1')
    ).rejects.toThrow(UserIdentityDeletionException);
    expect(
      platformUserRecordAuditService.recordActionForActor
    ).not.toHaveBeenCalled();
  });

  // 027-platform-role-redesign (sec-server-4 fix): wires the REAL
  // AuthorizationPolicyService + AuthorizationService so the constructor's
  // `accountDeletePolicy` is a genuine, hardcoded [PLATFORM_USERS_ADMIN,
  // GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER] policy — NOT the
  // shared platform policy, whose PLATFORM_USERS_ADMIN grant set
  // additively widens to also admit global-platform-manager (A4's legacy
  // reacher), who never held THIS surface (legacy PLATFORM_ADMIN's reach
  // was {GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER} only).
  describe('accountDeletePolicy — real-engine integration', () => {
    let realResolver: AdminUsersMutations;
    let realUserService: Record<string, Mock>;
    let realKratosService: Record<string, Mock>;

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
          AdminUsersMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(AdminUsersMutations);
      realUserService = module.get(UserService) as any;
      realKratosService = module.get(KratosService) as any;

      realUserService.getUserByIdOrFail.mockResolvedValue({
        id: 'user-1',
        email: 'user1@example.com',
      });
      realKratosService.deleteIdentityByEmail.mockResolvedValue(undefined);
      realUserService.clearAuthenticationIDForUser.mockResolvedValue({
        id: 'user-1',
      });
    });

    it('denies a global-platform-manager-only actor (never held this surface pre-feature)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.GLOBAL_PLATFORM_MANAGER
      );
      await expect(
        realResolver.adminUserAccountDelete(actor, 'user-1')
      ).rejects.toThrow();
    });

    it('allows a global-admin actor (pre-existing legacy reach preserved)', async () => {
      const actor = buildActorContext(AuthorizationCredential.GLOBAL_ADMIN);
      await expect(
        realResolver.adminUserAccountDelete(actor, 'user-1')
      ).resolves.toBeDefined();
    });

    it('allows a global-support actor (pre-existing legacy reach preserved)', async () => {
      const actor = buildActorContext(AuthorizationCredential.GLOBAL_SUPPORT);
      await expect(
        realResolver.adminUserAccountDelete(actor, 'user-1')
      ).resolves.toBeDefined();
    });

    it('allows a platform-users-admin actor (the new owning role)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_USERS_ADMIN
      );
      await expect(
        realResolver.adminUserAccountDelete(actor, 'user-1')
      ).resolves.toBeDefined();
    });
  });
});
