// server#6315 — session revocation cascade in UserService.deleteUser.
//
// Dedicated spec file (kept separate from user.service.spec.ts) covering the
// cascade added to `deleteUser` that revokes an account's BFF/OIDC sessions
// and Kratos SSO sessions on deletion. Traces to spec.md FR-023..FR-028 and
// User Story 1, acceptance scenarios 4-8 (specs/107-oidc-session-revocation).
import { LogContext } from '@common/enums';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { OidcSessionRevocationService } from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, vi } from 'vitest';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { UserSettingsService } from '../user-settings/user.settings.service';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';

const ConfigServiceMock = {
  get: vi.fn().mockReturnValue({
    kratos_admin_base_url_server: 'mockUrl',
  }),
};

const AUTHENTICATION_ID = 'kratos-id-123';

describe('UserService.deleteUser — session revocation cascade (server#6315)', () => {
  let service: UserService;
  let userLookupService: { getUserById: Mock };
  let accountLookupService: { areResourcesInAccount: Mock };
  let actorContextCacheService: { deleteByActorID: Mock };
  let profileService: { deleteProfile: Mock };
  let authorizationPolicyService: { delete: Mock };
  let storageAggregatorService: { delete: Mock };
  let userSettingsService: { deleteUserSettings: Mock };
  let actorService: { deleteActorById: Mock };
  let kratosService: {
    invalidateAllIdentitySessions: Mock;
    deleteIdentityById: Mock;
    clearIdentityActorMetadata: Mock;
  };
  let oidcSessionRevocationService: { revokeAllForSub: Mock };
  let logger: { error: Mock };
  let repository: any;

  const buildUser = (overrides: Partial<IUser> = {}): IUser =>
    ({
      id: 'user-1',
      accountID: 'account-1',
      profile: { id: 'profile-1' },
      storageAggregator: { id: 'sa-1' },
      authorization: { id: 'auth-1' },
      settings: { id: 'settings-1' },
      authenticationID: AUTHENTICATION_ID,
      ...overrides,
    }) as unknown as IUser;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        repositoryProviderMockFactory(User),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(UserService);
    repository = module.get(getRepositoryToken(User));
    // Default transaction mock: run the callback then resolve. Ordering
    // tests below install their own instrumented version.
    (repository as any).manager = {
      transaction: vi.fn(async (cb: any) => cb()),
    };

    userLookupService = module.get(UserLookupService) as any;
    accountLookupService = module.get(AccountLookupService) as any;
    actorContextCacheService = module.get(ActorContextCacheService) as any;
    profileService = module.get(ProfileService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    storageAggregatorService = module.get(StorageAggregatorService) as any;
    userSettingsService = module.get(UserSettingsService) as any;
    actorService = module.get(ActorService) as any;
    kratosService = module.get(KratosService) as any;
    oidcSessionRevocationService = module.get(
      OidcSessionRevocationService
    ) as any;
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as any;

    accountLookupService.areResourcesInAccount.mockResolvedValue(false);
    actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
    profileService.deleteProfile.mockResolvedValue(undefined);
    authorizationPolicyService.delete.mockResolvedValue(undefined);
    storageAggregatorService.delete.mockResolvedValue(undefined);
    userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
    actorService.deleteActorById.mockResolvedValue(undefined);
    kratosService.invalidateAllIdentitySessions.mockResolvedValue(undefined);
    kratosService.clearIdentityActorMetadata.mockResolvedValue(undefined);
    kratosService.deleteIdentityById.mockResolvedValue(undefined);
    oidcSessionRevocationService.revokeAllForSub.mockResolvedValue(undefined);
  });

  it('FR-023/FR-024: revokes OIDC sessions and invalidates Kratos identity sessions on deletion', async () => {
    const user = buildUser();
    userLookupService.getUserById.mockResolvedValue(user);

    await service.deleteUser({ ID: 'user-1' });

    expect(oidcSessionRevocationService.revokeAllForSub).toHaveBeenCalledWith(
      AUTHENTICATION_ID,
      'account_deleted'
    );
    expect(kratosService.invalidateAllIdentitySessions).toHaveBeenCalledWith(
      AUTHENTICATION_ID
    );
  });

  describe('FR-025: unconditional on deleteData.deleteIdentity', () => {
    it('still runs both revocation calls when deleteIdentity is false — only Kratos identity deletion is gated', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);

      await service.deleteUser({ ID: 'user-1', deleteIdentity: false });

      expect(
        oidcSessionRevocationService.revokeAllForSub
      ).toHaveBeenCalledTimes(1);
      expect(kratosService.invalidateAllIdentitySessions).toHaveBeenCalledTimes(
        1
      );
      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    });

    it('still runs both revocation calls when deleteIdentity is absent', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);

      await service.deleteUser({ ID: 'user-1' });

      expect(
        oidcSessionRevocationService.revokeAllForSub
      ).toHaveBeenCalledTimes(1);
      expect(kratosService.invalidateAllIdentitySessions).toHaveBeenCalledTimes(
        1
      );
      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    });

    it('runs both revocation calls AND deletes the Kratos identity when deleteIdentity is true', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);

      await service.deleteUser({ ID: 'user-1', deleteIdentity: true });

      expect(
        oidcSessionRevocationService.revokeAllForSub
      ).toHaveBeenCalledTimes(1);
      expect(kratosService.invalidateAllIdentitySessions).toHaveBeenCalledTimes(
        1
      );
      expect(kratosService.deleteIdentityById).toHaveBeenCalledWith(
        AUTHENTICATION_ID
      );
    });
  });

  it('FR-026: runs both revocation calls after the DB transaction commits, never inside it (revocation before the Kratos SSO call, per the documented ordering)', async () => {
    const user = buildUser();
    userLookupService.getUserById.mockResolvedValue(user);

    const order: string[] = [];
    (repository as any).manager = {
      transaction: vi.fn(async (cb: any) => {
        await cb();
        order.push('transaction-committed');
      }),
    };
    oidcSessionRevocationService.revokeAllForSub.mockImplementation(
      async () => {
        order.push('revokeAllForSub');
      }
    );
    kratosService.invalidateAllIdentitySessions.mockImplementation(async () => {
      order.push('invalidateAllIdentitySessions');
    });

    await service.deleteUser({ ID: 'user-1' });

    expect(order.indexOf('transaction-committed')).toBe(0);
    expect(order.indexOf('revokeAllForSub')).toBeGreaterThan(
      order.indexOf('transaction-committed')
    );
    expect(order.indexOf('invalidateAllIdentitySessions')).toBeGreaterThan(
      order.indexOf('transaction-committed')
    );
    expect(order.indexOf('revokeAllForSub')).toBeLessThan(
      order.indexOf('invalidateAllIdentitySessions')
    );
  });

  describe('FR-027/SC-004: deletion survives revocation failure (historical Kratos breakage: #5350, #5678, #4762, #2137)', () => {
    it('resolves with the deleted user and logs when revokeAllForSub rejects, without skipping the Kratos leg', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      oidcSessionRevocationService.revokeAllForSub.mockRejectedValue(
        new Error('redis unreachable')
      );

      const result = await service.deleteUser({ ID: 'user-1' });

      expect(result.id).toBe('user-1');
      expect(kratosService.invalidateAllIdentitySessions).toHaveBeenCalledWith(
        AUTHENTICATION_ID
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userID: 'user-1',
          authenticationID: AUTHENTICATION_ID,
        }),
        expect.anything(),
        LogContext.AUTH
      );
    });

    it('resolves with the deleted user and logs when invalidateAllIdentitySessions rejects', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      kratosService.invalidateAllIdentitySessions.mockRejectedValue(
        new Error('kratos unreachable')
      );

      const result = await service.deleteUser({ ID: 'user-1' });

      expect(result.id).toBe('user-1');
      expect(oidcSessionRevocationService.revokeAllForSub).toHaveBeenCalledWith(
        AUTHENTICATION_ID,
        'account_deleted'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userID: 'user-1',
          authenticationID: AUTHENTICATION_ID,
        }),
        expect.anything(),
        LogContext.AUTH
      );
    });

    it('still resolves with the deleted user when BOTH revocation legs reject', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      oidcSessionRevocationService.revokeAllForSub.mockRejectedValue(
        new Error('redis unreachable')
      );
      kratosService.invalidateAllIdentitySessions.mockRejectedValue(
        new Error('kratos unreachable')
      );

      const result = await service.deleteUser({ ID: 'user-1' });

      expect(result.id).toBe('user-1');
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });

  it('FR-017/FR-028: skips both revocation legs and deletes normally when authenticationID is null, with no error raised', async () => {
    const user = buildUser({ authenticationID: null as any });
    userLookupService.getUserById.mockResolvedValue(user);

    const result = await service.deleteUser({ ID: 'user-1' });

    expect(oidcSessionRevocationService.revokeAllForSub).not.toHaveBeenCalled();
    expect(kratosService.invalidateAllIdentitySessions).not.toHaveBeenCalled();
    expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(result.id).toBe('user-1');
  });

  it('preserves the returned user id through the delete + revocation cascade', async () => {
    const user = buildUser();
    userLookupService.getUserById.mockResolvedValue(user);

    const result = await service.deleteUser({ ID: 'user-1' });

    expect(result.id).toBe('user-1');
  });
});
