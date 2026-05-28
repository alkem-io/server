import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from '@domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
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
    // PlatformAuthorizationPolicyService is mocked by defaultMockerFactory
    module.get(PlatformAuthorizationPolicyService);
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
});
