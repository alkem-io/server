import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { LoggerService } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { AdminIdentityService } from '@src/platform-admin/core/identity/admin.identity.service';
import { AdminUsersMutations } from '@src/platform-admin/domain/user/admin.users.resolver.mutations';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { Mock, vi } from 'vitest';

const createLogger = () =>
  ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  }) as unknown as LoggerService;

describe('Platform-admin identity deletion flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clears authentication ID after adminUserAccountDelete executes', async () => {
    const authorizationService = {
      grantAccessOrFail: vi.fn(),
    } as unknown as AuthorizationService;
    const platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue({}),
    } as unknown as PlatformAuthorizationPolicyService;
    const kratosService = {
      deleteIdentityByEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as KratosService;
    const userService = {
      getUserByIdOrFail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        authenticationID: 'kratos-1',
      }),
      clearAuthenticationIDForUser: vi.fn().mockImplementation(async user => ({
        ...user,
        authenticationID: null,
      })),
    } as unknown as UserService & {
      getUserByIdOrFail: Mock;
      clearAuthenticationIDForUser: Mock;
    };
    const platformUserRecordAuditService = {
      recordActionForActor: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlatformUserRecordAuditService & {
      recordActionForActor: Mock;
    };

    const resolver = new AdminUsersMutations(
      authorizationService,
      platformAuthorizationPolicyService,
      kratosService,
      userService,
      platformUserRecordAuditService,
      createLogger()
    );

    const actorContext = new ActorContext();
    actorContext.actorID = 'admin@example.com';

    const result = await resolver.adminUserAccountDelete(
      actorContext,
      'user-1'
    );

    // 027-platform-role-redesign (T062): re-anchored off PLATFORM_ADMIN
    // onto PLATFORM_USERS_ADMIN.
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      {},
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      expect.any(String)
    );
    expect(userService.clearAuthenticationIDForUser).toHaveBeenCalled();
    expect(result.authenticationID).toBeNull();
    // T063: single-path surface — every successful call is audited, real
    // targeted user as subject (FR-030, SC-015).
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

  it('clears authentication ID when deleting Kratos identity by ID', async () => {
    const kratosService = {
      deleteIdentityById: vi.fn().mockResolvedValue(undefined),
      getIdentityByEmail: vi.fn(),
    } as unknown as KratosService & {
      deleteIdentityById: Mock;
    };

    const userLookupService = {
      getUserByAuthenticationID: vi
        .fn()
        .mockResolvedValue({ id: 'user-1', authenticationID: 'kratos-1' }),
      getUserByEmail: vi.fn(),
    } as unknown as UserLookupService & {
      getUserByAuthenticationID: Mock;
    };

    const userService = {
      clearAuthenticationIDForUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        authenticationID: null,
      }),
    } as unknown as UserService & {
      clearAuthenticationIDForUser: Mock;
    };

    const service = new AdminIdentityService(
      kratosService,
      userService,
      userLookupService,
      createLogger()
    );

    const result = await service.deleteIdentity('kratos-1');

    expect(result).toBe(true);
    expect(userLookupService.getUserByAuthenticationID).toHaveBeenCalledWith(
      'kratos-1'
    );
    expect(userService.clearAuthenticationIDForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' })
    );
  });
});
