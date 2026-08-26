// Account-deletion saga: the DB-only transactional deletion mode
// (`deleteUserDbOnly`) and the extracted post-commit external legs
// (`revokeUserSessionsAndIdentity`).
import { LogContext } from '@common/enums';
import {
  AccountDeletionBlockedException,
  ForbiddenException,
} from '@common/exceptions';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { OidcSessionRevocationService } from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountDeletionBlockerService } from '@domain/community/user/account-deletion/account.deletion.blocker.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { UserSettingsService } from '../user-settings/user.settings.service';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { UserService } from './user.service';

const ConfigServiceMock = {
  get: vi.fn().mockReturnValue({ kratos_admin_base_url_server: 'mockUrl' }),
};

const AUTHENTICATION_ID = 'kratos-id-123';

describe('UserService — account-deletion saga methods', () => {
  let service: UserService;
  let userLookupService: { getUserById: Mock };
  let accountLookupService: { areResourcesInAccount: Mock };
  let accountDeletionBlockerService: { getBlockers: Mock };
  let actorContextCacheService: { deleteByActorID: Mock };
  let profileService: { deleteProfileForAccountDeletion: Mock };
  let authorizationPolicyService: { delete: Mock };
  let storageAggregatorService: { deleteForAccountDeletion: Mock };
  let userSettingsService: { deleteUserSettings: Mock };
  let actorService: { deleteActorById: Mock };
  let kratosService: {
    invalidateAllIdentitySessions: Mock;
    deleteIdentityById: Mock;
    clearIdentityActorMetadata: Mock;
  };
  let oidcSessionRevocationService: { revokeAllForSub: Mock };
  let logger: { error: Mock };

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

    userLookupService = module.get(UserLookupService) as any;
    accountLookupService = module.get(AccountLookupService) as any;
    accountDeletionBlockerService = module.get(
      AccountDeletionBlockerService
    ) as any;
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
    accountDeletionBlockerService.getBlockers.mockResolvedValue({
      canDelete: true,
      blockers: [],
      totals: [],
      truncated: false,
    });
    actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
    profileService.deleteProfileForAccountDeletion.mockResolvedValue({
      profile: {},
      documentIDs: [],
    });
    authorizationPolicyService.delete.mockResolvedValue(undefined);
    storageAggregatorService.deleteForAccountDeletion.mockResolvedValue({
      storageAggregator: {},
      documentIDs: [],
    });
    userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
    actorService.deleteActorById.mockResolvedValue(undefined);
    kratosService.invalidateAllIdentitySessions.mockResolvedValue(undefined);
    kratosService.clearIdentityActorMetadata.mockResolvedValue(undefined);
    kratosService.deleteIdentityById.mockResolvedValue(undefined);
    oidcSessionRevocationService.revokeAllForSub.mockResolvedValue(undefined);
  });

  describe('deleteUserDbOnly', () => {
    it('joins the passed EntityManager on every write and never touches Kratos/session services', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      const em = {} as EntityManager;

      const result = await service.deleteUserDbOnly(
        { ID: 'user-1' },
        em,
        'self'
      );

      expect(accountDeletionBlockerService.getBlockers).toHaveBeenCalledWith(
        'user-1',
        'account-1',
        'self'
      );
      expect(
        profileService.deleteProfileForAccountDeletion
      ).toHaveBeenCalledWith('profile-1', em);
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        user.authorization,
        em
      );
      expect(
        storageAggregatorService.deleteForAccountDeletion
      ).toHaveBeenCalledWith('sa-1', em);
      expect(userSettingsService.deleteUserSettings).toHaveBeenCalledWith(
        'settings-1',
        em
      );
      expect(actorService.deleteActorById).toHaveBeenCalledWith('user-1', em);
      expect(
        oidcSessionRevocationService.revokeAllForSub
      ).not.toHaveBeenCalled();
      expect(
        kratosService.invalidateAllIdentitySessions
      ).not.toHaveBeenCalled();
      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
      expect(result.user.id).toBe('user-1');
    });

    it('combines the profile and storage-aggregator document external ids', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      profileService.deleteProfileForAccountDeletion.mockResolvedValue({
        profile: {},
        documentIDs: ['ext-1'],
      });
      storageAggregatorService.deleteForAccountDeletion.mockResolvedValue({
        storageAggregator: {},
        documentIDs: ['ext-2', 'ext-3'],
      });

      const result = await service.deleteUserDbOnly(
        { ID: 'user-1' },
        {} as EntityManager,
        'self'
      );

      expect(result.documentIDs).toEqual(['ext-1', 'ext-2', 'ext-3']);
    });

    it('refuses with ACCOUNT_DELETION_BLOCKED on the self branch when blocked', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      accountDeletionBlockerService.getBlockers.mockResolvedValue({
        canDelete: false,
        blockers: [
          {
            kind: 'ACCOUNT_SPACE',
            resourceID: 's-1',
            displayName: 'Space',
            selfResolvable: true,
          },
        ],
        totals: [{ kind: 'ACCOUNT_SPACE', total: 1 }],
        truncated: false,
      });

      await expect(
        service.deleteUserDbOnly({ ID: 'user-1' }, {} as EntityManager, 'self')
      ).rejects.toThrow(AccountDeletionBlockedException);
      expect(
        profileService.deleteProfileForAccountDeletion
      ).not.toHaveBeenCalled();
    });

    it('refuses with the pre-existing ForbiddenException on the admin branch when blocked', async () => {
      const user = buildUser();
      userLookupService.getUserById.mockResolvedValue(user);
      accountDeletionBlockerService.getBlockers.mockResolvedValue({
        canDelete: false,
        blockers: [
          {
            kind: 'ACCOUNT_SPACE',
            resourceID: 's-1',
            displayName: 'Space',
            selfResolvable: true,
          },
        ],
        totals: [{ kind: 'ACCOUNT_SPACE', total: 1 }],
        truncated: false,
      });

      await expect(
        service.deleteUserDbOnly({ ID: 'user-1' }, {} as EntityManager, 'admin')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeUserSessionsAndIdentity', () => {
    it('reports success on both legs when everything succeeds and deleteIdentity is true', async () => {
      const user = buildUser();

      const outcome = await service.revokeUserSessionsAndIdentity(user, {
        ID: 'user-1',
        deleteIdentity: true,
      });

      expect(outcome).toEqual({
        sessionRevocationSucceeded: true,
        identityDeletionAttempted: true,
        identityDeletionSucceeded: true,
      });
      expect(kratosService.deleteIdentityById).toHaveBeenCalledWith(
        AUTHENTICATION_ID
      );
    });

    it('does not attempt identity deletion when deleteIdentity is false', async () => {
      const user = buildUser();

      const outcome = await service.revokeUserSessionsAndIdentity(user, {
        ID: 'user-1',
        deleteIdentity: false,
      });

      expect(outcome.identityDeletionAttempted).toBe(false);
      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    });

    it('reports sessionRevocationSucceeded=false and logs when the OIDC leg fails', async () => {
      const user = buildUser();
      oidcSessionRevocationService.revokeAllForSub.mockRejectedValue(
        new Error('redis unreachable')
      );

      const outcome = await service.revokeUserSessionsAndIdentity(user, {
        ID: 'user-1',
      });

      expect(outcome.sessionRevocationSucceeded).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userID: 'user-1' }),
        expect.anything(),
        LogContext.AUTH
      );
    });

    it('reports identityDeletionSucceeded=false when the Kratos deletion call fails', async () => {
      const user = buildUser();
      kratosService.deleteIdentityById.mockRejectedValue(
        new Error('kratos unreachable')
      );

      const outcome = await service.revokeUserSessionsAndIdentity(user, {
        ID: 'user-1',
        deleteIdentity: true,
      });

      expect(outcome.identityDeletionAttempted).toBe(true);
      expect(outcome.identityDeletionSucceeded).toBe(false);
    });

    it('is a no-op returning all-success when the user has no authenticationID', async () => {
      const user = buildUser({ authenticationID: null as any });

      const outcome = await service.revokeUserSessionsAndIdentity(user, {
        ID: 'user-1',
        deleteIdentity: true,
      });

      expect(outcome).toEqual({
        sessionRevocationSucceeded: true,
        identityDeletionAttempted: false,
        identityDeletionSucceeded: false,
      });
      expect(
        oidcSessionRevocationService.revokeAllForSub
      ).not.toHaveBeenCalled();
      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    });
  });
});
