import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from '@domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { AdminUserEmailChangeResolverMutations } from './admin.user.email.change.resolver.mutations';

describe('AdminUserEmailChangeResolverMutations', () => {
  let resolver: AdminUserEmailChangeResolverMutations;
  let authorizationService: Record<string, Mock>;
  let userEmailChangeService: Record<string, Mock>;

  const actorContext = { actorID: 'admin-1' } as unknown as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminUserEmailChangeResolverMutations],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminUserEmailChangeResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    userEmailChangeService = module.get(UserEmailChangeService) as any;
  });

  it('rewraps a non-admin authorization failure as EMAIL_CHANGE_UNAUTHORIZED', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(
      resolver.adminUserEmailChange(actorContext, {
        userID: 'subject-1',
        newEmail: 'new@example.com',
        reason: 'support ticket #4821',
        approver: {
          name: 'Jane Approver',
          role: 'Organization Administrator',
        },
      })
    ).rejects.toMatchObject({
      code: UserEmailChangeErrorCode.EMAIL_CHANGE_UNAUTHORIZED,
    });
    expect(userEmailChangeService.applyAdminEmailChange).not.toHaveBeenCalled();
  });

  it('delegates to applyAdminEmailChange with the actor and input', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userEmailChangeService.applyAdminEmailChange.mockResolvedValue({
      success: true,
      email: 'new@example.com',
    });

    const approver = {
      name: 'Jane Approver',
      role: 'Organization Administrator',
    };
    const result = await resolver.adminUserEmailChange(actorContext, {
      userID: 'subject-1',
      newEmail: 'new@example.com',
      reason: 'support ticket #4821',
      approver,
    });

    expect(userEmailChangeService.applyAdminEmailChange).toHaveBeenCalledWith(
      'admin-1',
      'subject-1',
      'new@example.com',
      'support ticket #4821',
      approver
    );
    expect(result).toEqual({ success: true, email: 'new@example.com' });
  });

  it('rewraps a non-admin authorization failure on drift-resolve', async () => {
    authorizationService.grantAccessOrFail.mockImplementation(() => {
      throw new Error('forbidden');
    });

    await expect(
      resolver.adminUserEmailChangeDriftResolve(actorContext, {
        userID: 'subject-1',
        canonicalEmail: 'pick@example.com',
      })
    ).rejects.toBeInstanceOf(UserEmailChangeException);
  });

  it('delegates to resolveDrift on success', async () => {
    authorizationService.grantAccessOrFail.mockReturnValue(true);
    userEmailChangeService.resolveDrift.mockResolvedValue({
      success: true,
      email: 'canonical@example.com',
    });
    const result = await resolver.adminUserEmailChangeDriftResolve(
      actorContext,
      { userID: 'subject-1', canonicalEmail: 'canonical@example.com' }
    );
    expect(userEmailChangeService.resolveDrift).toHaveBeenCalledWith(
      'admin-1',
      'subject-1',
      'canonical@example.com'
    );
    expect(result.success).toBe(true);
  });

  // 027-platform-role-redesign (sec-server-7 fix): wires the REAL
  // AuthorizationPolicyService + AuthorizationService so the constructor's
  // `emailChangePolicy` is a genuine, hardcoded [PLATFORM_USERS_ADMIN,
  // GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER] policy — NOT the
  // shared platform policy, whose PLATFORM_USERS_ADMIN grant set
  // additively widens to also admit global-platform-manager, who never
  // held these two mutations' pre-feature PLATFORM_ADMIN gate.
  describe('emailChangePolicy — real-engine integration', () => {
    let realResolver: AdminUserEmailChangeResolverMutations;
    let realUserEmailChangeService: Record<string, Mock>;

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
          AdminUserEmailChangeResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      realResolver = module.get(AdminUserEmailChangeResolverMutations);
      realUserEmailChangeService = module.get(UserEmailChangeService) as any;
      realUserEmailChangeService.applyAdminEmailChange.mockResolvedValue({
        success: true,
        email: 'new@example.com',
      });
    });

    it('denies a global-platform-manager-only actor (never held this surface pre-feature)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_SETTINGS_ADMIN
      );
      await expect(
        realResolver.adminUserEmailChange(actor, {
          userID: 'subject-1',
          newEmail: 'new@example.com',
          reason: 'support ticket #4821',
          approver: {
            name: 'Jane Approver',
            role: 'Organization Administrator',
          },
        })
      ).rejects.toBeInstanceOf(UserEmailChangeException);
    });

    // 027-platform-role-redesign (T076, Slice B): INVERTED. This asserted the
    // legacy credential's pre-feature reach through the additive slice; T076
    // dropped every legacy credential from A4's grant set, so Platform Users
    // Admin holds the login-email change alone (FR-007(d), spec row 6).
    it('DENIES a platform-content-full-access actor — changing a login email is the user-record family', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      await expect(
        realResolver.adminUserEmailChange(actor, {
          userID: 'subject-1',
          newEmail: 'new@example.com',
          reason: 'support ticket #4821',
          approver: {
            name: 'Jane Approver',
            role: 'Organization Administrator',
          },
        })
      ).rejects.toThrow();
    });

    it('allows a platform-users-admin actor (the new owning role)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_USERS_ADMIN
      );
      await expect(
        realResolver.adminUserEmailChange(actor, {
          userID: 'subject-1',
          newEmail: 'new@example.com',
          reason: 'support ticket #4821',
          approver: {
            name: 'Jane Approver',
            role: 'Organization Administrator',
          },
        })
      ).resolves.toBeDefined();
    });
  });
});
