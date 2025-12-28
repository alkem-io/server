import { AdminUsersMutations } from '@src/platform-admin/domain/user/admin.users.resolver.mutations';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { UserService } from '@domain/community/user/user.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { AdminIdentityService } from '@src/platform-admin/core/identity/admin.identity.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

const createLogger = () =>
  ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
  }) as unknown as LoggerService;

describe('Platform-admin identity deletion flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears authentication ID after adminUserAccountDelete executes', async () => {
    const authorizationService = {
      grantAccessOrFail: jest.fn(),
    } as unknown as AuthorizationService;
    const platformAuthorizationPolicyService = {
      getPlatformAuthorizationPolicy: jest.fn().mockResolvedValue({}),
    } as unknown as PlatformAuthorizationPolicyService;
    const kratosService = {
      deleteIdentityByEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as KratosService;
    const userService = {
      getUserByIdOrFail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        authenticationID: 'kratos-1',
      }),
      clearAuthenticationIDForUser: jest
        .fn()
        .mockImplementation(async user => ({
          ...user,
          authenticationID: null,
        })),
    } as unknown as UserService & {
      getUserByIdOrFail: jest.Mock;
      clearAuthenticationIDForUser: jest.Mock;
    };

    const resolver = new AdminUsersMutations(
      authorizationService,
      platformAuthorizationPolicyService,
      kratosService,
      userService,
      createLogger()
    );

    const actorContext = new ActorContext();
    actorContext.actorId = 'admin-user-id';

    const result = await resolver.adminUserAccountDelete(
      actorContext,
      'user-1'
    );

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      {},
      AuthorizationPrivilege.PLATFORM_ADMIN,
      expect.any(String)
    );
    expect(userService.clearAuthenticationIDForUser).toHaveBeenCalled();
    expect(result.authenticationID).toBeNull();
  });

  it('clears authentication ID when deleting Kratos identity by ID', async () => {
    const kratosService = {
      deleteIdentityById: jest.fn().mockResolvedValue(undefined),
      getIdentityByEmail: jest.fn(),
    } as unknown as KratosService & {
      deleteIdentityById: jest.Mock;
    };

    const userLookupService = {
      getUserByAuthenticationID: jest
        .fn()
        .mockResolvedValue({ id: 'user-1', authenticationID: 'kratos-1' }),
      getUserByEmail: jest.fn(),
    } as unknown as UserLookupService & {
      getUserByAuthenticationID: jest.Mock;
    };

    const userService = {
      clearAuthenticationIDForUser: jest.fn().mockResolvedValue({
        id: 'user-1',
        authenticationID: null,
      }),
    } as unknown as UserService & {
      clearAuthenticationIDForUser: jest.Mock;
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
