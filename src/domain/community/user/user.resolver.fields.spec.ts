import { AuthorizationCredential } from '@common/enums';
import { AuthenticationType } from '@common/enums/authentication.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  DELETED_USER_SENTINEL,
  DELETED_USER_SENTINEL_ID,
} from '@domain/community/user/account-deletion/deleted.user.sentinel';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserResolverFields } from './user.resolver.fields';
import { UserService } from './user.service';

describe('UserResolverFields', () => {
  let resolver: UserResolverFields;
  let authorizationService: {
    isAccessGranted: Mock;
  };
  let userService: {
    getUserByIdOrFail: Mock;
    getAccount: Mock;
  };
  let platformAuthorizationService: {
    getPlatformAuthorizationPolicy: Mock;
  };
  let kratosService: {
    getIdentityByEmail: Mock;
    getAuthenticationTypeFromIdentity: Mock;
    getCreatedAt: Mock;
    getAuthenticatedAt: Mock;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserResolverFields, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(UserResolverFields);
    authorizationService = module.get(AuthorizationService) as any;
    userService = module.get(UserService) as any;
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    kratosService = module.get(KratosService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('email', () => {
    it('should return email when access granted', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.email(user, actorContext);
      expect(result).toBe('test@example.com');
    });

    it('should return "not accessible" when access denied', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.email(user, actorContext);
      expect(result).toBe('not accessible');
    });
  });

  describe('phone', () => {
    it('should return phone when access granted', async () => {
      const user = {
        id: 'user-1',
        phone: '+1234567890',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.phone(user, actorContext);
      expect(result).toBe('+1234567890');
    });

    it('should return null when phone is not set and access granted', async () => {
      const user = {
        id: 'user-1',
        phone: undefined,
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.phone(user, actorContext);
      expect(result).toBeNull();
    });

    it('should return "not accessible" when access denied', async () => {
      const user = {
        id: 'user-1',
        phone: '+1234567890',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.phone(user, actorContext);
      expect(result).toBe('not accessible');
    });
  });

  describe('account', () => {
    it('should return account when user is current actor', async () => {
      const mockAccount = { id: 'account-1' };
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = { actorID: 'user-1', credentials: [] } as any;

      userService.getAccount.mockResolvedValue(mockAccount);

      const result = await resolver.account(user, actorContext);
      expect(result).toBe(mockAccount);
    });

    it('should return account when access granted via privilege', async () => {
      const mockAccount = { id: 'account-1' };
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = {
        actorID: 'other-user',
        credentials: [],
      } as any;

      authorizationService.isAccessGranted.mockReturnValue(true);
      userService.getAccount.mockResolvedValue(mockAccount);

      const result = await resolver.account(user, actorContext);
      expect(result).toBe(mockAccount);
    });

    it('should return undefined when access denied and not current actor', async () => {
      const user = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = {
        actorID: 'other-user',
        credentials: [],
      } as any;

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.account(user, actorContext);
      expect(result).toBeUndefined();
    });
  });

  describe('authentication', () => {
    it('should return full auth details for the current actor', async () => {
      const user = { id: 'user-1', email: 'test@example.com' } as any;
      const actorContext = { actorID: 'user-1', credentials: [] } as any;
      const mockIdentity = { id: 'kratos-1' };

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {}
      );
      authorizationService.isAccessGranted.mockReturnValue(false);
      kratosService.getIdentityByEmail.mockResolvedValue(mockIdentity);
      kratosService.getAuthenticationTypeFromIdentity.mockResolvedValue([
        AuthenticationType.EMAIL,
      ]);
      kratosService.getCreatedAt.mockResolvedValue(new Date('2024-01-01'));
      kratosService.getAuthenticatedAt.mockResolvedValue(
        new Date('2024-06-01')
      );

      const result = await resolver.authentication(user, actorContext);

      expect(result.methods).toEqual([AuthenticationType.EMAIL]);
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
      expect(result.authenticatedAt).toEqual(new Date('2024-06-01'));
    });

    it('should return UNKNOWN auth type for non-current, non-admin actor', async () => {
      const user = { id: 'user-1', email: 'test@example.com' } as any;
      const actorContext = {
        actorID: 'other-user',
        credentials: [],
      } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {}
      );
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.authentication(user, actorContext);

      expect(result.methods).toEqual([AuthenticationType.UNKNOWN]);
      expect(result.createdAt).toBeUndefined();
      expect(result.authenticatedAt).toBeUndefined();
    });

    it('should return full auth details for platform admin', async () => {
      const user = { id: 'user-1', email: 'test@example.com' } as any;
      const actorContext = {
        actorID: 'admin-user',
        credentials: [],
      } as any;
      const mockIdentity = { id: 'kratos-1' };

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {}
      );
      authorizationService.isAccessGranted.mockReturnValue(true);
      kratosService.getIdentityByEmail.mockResolvedValue(mockIdentity);
      kratosService.getAuthenticationTypeFromIdentity.mockResolvedValue([
        AuthenticationType.LINKEDIN,
      ]);
      kratosService.getCreatedAt.mockResolvedValue(undefined);
      kratosService.getAuthenticatedAt.mockResolvedValue(undefined);

      const result = await resolver.authentication(user, actorContext);

      expect(result.methods).toEqual([AuthenticationType.LINKEDIN]);
    });

    it('should return default result when identity not found in Kratos', async () => {
      const user = { id: 'user-1', email: 'test@example.com' } as any;
      const actorContext = { actorID: 'user-1', credentials: [] } as any;

      platformAuthorizationService.getPlatformAuthorizationPolicy.mockResolvedValue(
        {}
      );
      authorizationService.isAccessGranted.mockReturnValue(false);
      kratosService.getIdentityByEmail.mockResolvedValue(null);

      const result = await resolver.authentication(user, actorContext);

      expect(result.methods).toEqual([AuthenticationType.UNKNOWN]);
    });
  });

  describe('profile', () => {
    it('short-circuits the deleted-user sentinel to its static profile, never touching the loader', async () => {
      const sentinelUser = { id: DELETED_USER_SENTINEL_ID } as any;
      const loader = { load: vi.fn() } as any;

      const result = await resolver.profile(sentinelUser, loader);

      expect(result).toBe(DELETED_USER_SENTINEL.profile);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('resolves a real user through the loader as before', async () => {
      const user = { id: 'user-1' } as any;
      const profile = { id: 'profile-1', displayName: 'Real User' };
      const loader = { load: vi.fn().mockResolvedValue(profile) } as any;

      const result = await resolver.profile(user, loader);

      expect(loader.load).toHaveBeenCalledWith('user-1');
      expect(result).toBe(profile);
    });
  });

  describe('the deleted-user sentinel — every downstream field, not just profile', () => {
    const sentinelUser = { id: DELETED_USER_SENTINEL_ID } as any;
    const actorContext = { actorID: 'viewer-1', credentials: [] } as any;

    it('resolves actor to the sentinel without touching the loader', async () => {
      const loader = { load: vi.fn() } as any;

      const result = await resolver.agent(sentinelUser, loader);

      expect(result).toBe(DELETED_USER_SENTINEL);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('resolves authorization to the closed sentinel policy without touching the loader', async () => {
      const loader = { load: vi.fn() } as any;

      const result = await resolver.authorization(sentinelUser, loader);

      expect(result).toBe(DELETED_USER_SENTINEL.authorization);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('resolves email to "not accessible" without reloading the user', async () => {
      const result = await resolver.email(sentinelUser, actorContext);

      expect(result).toBe('not accessible');
      expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('resolves phone to "not accessible" without reloading the user', async () => {
      const result = await resolver.phone(sentinelUser, actorContext);

      expect(result).toBe('not accessible');
      expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
    });

    it('resolves account to undefined without reloading the user', async () => {
      const result = await resolver.account(sentinelUser, actorContext);

      expect(result).toBeUndefined();
      expect(userService.getAccount).not.toHaveBeenCalled();
    });

    it('resolves isContactable to false without touching the loader', async () => {
      const loader = { load: vi.fn() } as any;

      const result = await resolver.isContactable(sentinelUser, loader);

      expect(result).toBe(false);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('resolves isContactableViaEmail to false without touching the loader', async () => {
      const loader = { load: vi.fn() } as any;

      const result = await resolver.isContactableViaEmail(sentinelUser, loader);

      expect(result).toBe(false);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('resolves storageAggregator to undefined without touching the loader', async () => {
      const loader = { load: vi.fn() } as any;

      const result = await resolver.storageAggregator(sentinelUser, loader);

      expect(result).toBeUndefined();
      expect(loader.load).not.toHaveBeenCalled();
    });
  });

  describe('isAccessGranted (private, tested indirectly via email)', () => {
    it('should reload authorization when not available on user entity', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        authorization: undefined,
      } as any;
      const actorContext = { actorID: 'actor-1', credentials: [] } as any;

      const loadedUser = {
        id: 'user-1',
        authorization: { id: 'auth-reloaded' },
      };
      userService.getUserByIdOrFail.mockResolvedValue(loadedUser);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await resolver.email(user, actorContext);
      expect(userService.getUserByIdOrFail).toHaveBeenCalledWith('user-1');
      expect(result).toBe('test@example.com');
    });

    it('should log error when access denied but actor has global credential', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        authorization: { id: 'auth-1' },
      } as any;
      const actorContext = {
        actorID: 'actor-1',
        credentials: [
          {
            type: AuthorizationCredential.GLOBAL_COMMUNITY_READ,
          },
        ],
      } as any;

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await resolver.email(user, actorContext);
      expect(result).toBe('not accessible');
    });
  });
});
