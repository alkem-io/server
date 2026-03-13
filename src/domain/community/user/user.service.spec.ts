import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
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

describe('UserService', () => {
  let service: UserService;
  let userLookupService: {
    getUserById: Mock;
    isRegisteredUser: Mock;
    getUserByAuthenticationID: Mock;
    getUserByEmail: Mock;
    usersWithCredential: Mock;
  };
  let actorContextCacheService: { deleteByActorID: Mock };
  let accountLookupService: {
    getAccountOrFail: Mock;
    areResourcesInAccount: Mock;
  };
  let userSettingsService: {
    updateSettings: Mock;
    createUserSettings: Mock;
    deleteUserSettings: Mock;
  };
  let profileService: {
    updateProfile: Mock;
    deleteProfile: Mock;
    createProfile: Mock;
    addOrUpdateTagsetOnProfile: Mock;
  };
  let authorizationPolicyService: { delete: Mock };
  let storageAggregatorService: { delete: Mock };
  let actorService: { deleteActorById: Mock };
  let kratosService: { deleteIdentityById: Mock };
  let repository: {
    findOne: Mock;
    save: Mock;
    count: Mock;
    findBy: Mock;
    createQueryBuilder: Mock;
  };

  beforeEach(async () => {
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
    // Add manager.transaction mock for transactional delete
    (repository as any).manager = {
      transaction: vi.fn(async (cb: any) => cb()),
    };
    userLookupService = module.get(UserLookupService) as any;
    actorContextCacheService = module.get(ActorContextCacheService) as any;
    accountLookupService = module.get(AccountLookupService) as any;
    userSettingsService = module.get(UserSettingsService) as any;
    profileService = module.get(ProfileService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    storageAggregatorService = module.get(StorageAggregatorService) as any;
    actorService = module.get(ActorService) as any;
    kratosService = module.get(KratosService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserByIdOrFail', () => {
    it('should throw EntityNotFoundException when userID is empty string', async () => {
      await expect(service.getUserByIdOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      userLookupService.getUserById.mockResolvedValue(null);
      await expect(
        service.getUserByIdOrFail('non-existent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return user when found', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as IUser;
      userLookupService.getUserById.mockResolvedValue(mockUser);
      const result = await service.getUserByIdOrFail('user-1');
      expect(result).toBe(mockUser);
    });

    it('should pass options to lookup service', async () => {
      const mockUser = { id: 'user-1' } as IUser;
      const options = { relations: { profile: true } };
      userLookupService.getUserById.mockResolvedValue(mockUser);
      await service.getUserByIdOrFail('user-1', options as any);
      expect(userLookupService.getUserById).toHaveBeenCalledWith(
        'user-1',
        options
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should throw FormatNotSupportedException for invalid email', async () => {
      await expect(service.getUserByEmail('not-an-email')).rejects.toThrow(
        FormatNotSupportedException
      );
    });

    it('should return null when user not found', async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await service.getUserByEmail('valid@example.com');
      expect(result).toBeNull();
    });

    it('should return user for valid email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'valid@example.com',
      } as IUser;
      repository.findOne.mockResolvedValue(mockUser);
      const result = await service.getUserByEmail('valid@example.com');
      expect(result).toBe(mockUser);
    });

    it('should lowercase the email in the query', async () => {
      repository.findOne.mockResolvedValue(null);
      await service.getUserByEmail('USER@EXAMPLE.COM');
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'user@example.com' },
        })
      );
    });
  });

  describe('save', () => {
    it('should call repository save', async () => {
      const mockUser = { id: 'user-1' } as IUser;
      repository.save.mockResolvedValue(mockUser);
      const result = await service.save(mockUser);
      expect(result).toBe(mockUser);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update firstName when provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'existing-name',
        firstName: 'OldFirst',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1', firstName: 'NewFirst' } as any);
      expect(existingUser.firstName).toBe('NewFirst');
    });

    it('should update lastName when provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'existing-name',
        lastName: 'OldLast',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1', lastName: 'NewLast' } as any);
      expect(existingUser.lastName).toBe('NewLast');
    });

    it('should update phone when provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'existing-name',
        phone: '123',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1', phone: '456' } as any);
      expect(existingUser.phone).toBe('456');
    });

    it('should update serviceProfile when provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'existing-name',
        serviceProfile: false,
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({
        ID: 'user-1',
        serviceProfile: true,
      } as any);
      expect(existingUser.serviceProfile).toBe(true);
    });

    it('should update profile when profileData provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'existing-name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      userLookupService.getUserById.mockResolvedValue(existingUser);
      profileService.updateProfile.mockResolvedValue(updatedProfile as any);
      repository.save.mockResolvedValue({
        ...existingUser,
        profile: updatedProfile,
      });
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({
        ID: 'user-1',
        profileData: { displayName: 'Updated' },
      } as any);
      expect(profileService.updateProfile).toHaveBeenCalled();
    });

    it('should check nameID uniqueness when changing it', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'old-name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.count.mockResolvedValue(0);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1', nameID: 'new-name' } as any);
      expect(existingUser.nameID).toBe('new-name');
    });

    it('should not check nameID uniqueness when nameID unchanged (case insensitive)', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'same-name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1', nameID: 'SAME-NAME' } as any);
      expect(repository.count).not.toHaveBeenCalled();
    });

    it('should invalidate actor context cache after saving', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1' } as any);
      expect(actorContextCacheService.deleteByActorID).toHaveBeenCalledWith(
        'user-1'
      );
    });
  });

  describe('deleteUser', () => {
    it('should throw RelationshipNotFoundException when required relations missing', async () => {
      const userWithoutRelations = {
        id: 'user-1',
        profile: null,
        storageAggregator: null,
        authorization: null,
        settings: null,
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(userWithoutRelations);

      await expect(service.deleteUser({ ID: 'user-1' })).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw ForbiddenException when account has resources', async () => {
      const user = {
        id: 'user-1',
        accountID: 'account-1',
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
        settings: { id: 'settings-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      accountLookupService.areResourcesInAccount.mockResolvedValue(true);

      await expect(service.deleteUser({ ID: 'user-1' })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should delete all child entities and return user with original id', async () => {
      const user = {
        id: 'user-1',
        accountID: 'account-1',
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
        settings: { id: 'settings-1' },
        authenticationID: null,
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      storageAggregatorService.delete.mockResolvedValue(undefined);
      userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);

      const result = await service.deleteUser({ ID: 'user-1' });

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        user.authorization
      );
      expect(storageAggregatorService.delete).toHaveBeenCalledWith('sa-1');
      expect(userSettingsService.deleteUserSettings).toHaveBeenCalledWith(
        'settings-1'
      );
      expect(actorService.deleteActorById).toHaveBeenCalledWith('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should delete Kratos identity when deleteIdentity is true and authenticationID exists', async () => {
      const user = {
        id: 'user-1',
        accountID: 'account-1',
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
        settings: { id: 'settings-1' },
        authenticationID: 'kratos-id-123',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      storageAggregatorService.delete.mockResolvedValue(undefined);
      userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);
      kratosService.deleteIdentityById.mockResolvedValue(undefined);

      await service.deleteUser({ ID: 'user-1', deleteIdentity: true });

      expect(kratosService.deleteIdentityById).toHaveBeenCalledWith(
        'kratos-id-123'
      );
    });

    it('should not delete Kratos identity when deleteIdentity is false', async () => {
      const user = {
        id: 'user-1',
        accountID: 'account-1',
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
        settings: { id: 'settings-1' },
        authenticationID: 'kratos-id-123',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      storageAggregatorService.delete.mockResolvedValue(undefined);
      userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);

      await service.deleteUser({ ID: 'user-1', deleteIdentity: false });

      expect(kratosService.deleteIdentityById).not.toHaveBeenCalled();
    });

    it('should handle Kratos identity deletion failure gracefully', async () => {
      const user = {
        id: 'user-1',
        accountID: 'account-1',
        profile: { id: 'profile-1' },
        storageAggregator: { id: 'sa-1' },
        authorization: { id: 'auth-1' },
        settings: { id: 'settings-1' },
        authenticationID: 'kratos-id-123',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      accountLookupService.areResourcesInAccount.mockResolvedValue(false);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);
      profileService.deleteProfile.mockResolvedValue(undefined);
      authorizationPolicyService.delete.mockResolvedValue(undefined);
      storageAggregatorService.delete.mockResolvedValue(undefined);
      userSettingsService.deleteUserSettings.mockResolvedValue(undefined);
      actorService.deleteActorById.mockResolvedValue(undefined);
      kratosService.deleteIdentityById.mockRejectedValue(
        new Error('Kratos error')
      );

      // Should not throw - Kratos failure is caught
      const result = await service.deleteUser({
        ID: 'user-1',
        deleteIdentity: true,
      });
      expect(result.id).toBe('user-1');
    });
  });

  describe('getProfile', () => {
    it('should return profile when loaded', async () => {
      const profile = { id: 'profile-1', displayName: 'Test User' };
      const userWithProfile = { id: 'user-1', profile } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(userWithProfile);

      const result = await service.getProfile({ id: 'user-1' } as IUser);
      expect(result).toBe(profile);
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const userWithoutProfile = {
        id: 'user-1',
        profile: undefined,
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(userWithoutProfile);

      await expect(
        service.getProfile({ id: 'user-1' } as IUser)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storageAggregator when found', async () => {
      const sa = { id: 'sa-1' };
      const userWithSA = {
        id: 'user-1',
        storageAggregator: sa,
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(userWithSA);

      const result = await service.getStorageAggregatorOrFail('user-1');
      expect(result).toBe(sa);
    });

    it('should throw EntityNotFoundException when storageAggregator is missing', async () => {
      const userWithoutSA = {
        id: 'user-1',
        nameID: 'test-user',
        storageAggregator: undefined,
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(userWithoutSA);

      await expect(
        service.getStorageAggregatorOrFail('user-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getAccount', () => {
    it('should delegate to accountLookupService', async () => {
      const mockAccount = { id: 'account-1' };
      accountLookupService.getAccountOrFail.mockResolvedValue(
        mockAccount as any
      );
      const user = { accountID: 'account-1' } as IUser;
      const result = await service.getAccount(user);
      expect(result).toBe(mockAccount);
      expect(accountLookupService.getAccountOrFail).toHaveBeenCalledWith(
        'account-1'
      );
    });
  });

  describe('updateUserSettings', () => {
    it('should update settings and save user', async () => {
      const user = { id: 'user-1', settings: {} } as unknown as IUser;
      const updatedSettings = { communication: {} };
      userSettingsService.updateSettings.mockReturnValue(
        updatedSettings as any
      );
      repository.save.mockResolvedValue({
        ...user,
        settings: updatedSettings,
      });

      await service.updateUserSettings(user, {} as any);
      expect(userSettingsService.updateSettings).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateUserPlatformSettings', () => {
    it('should update nameID when new value provided', async () => {
      const user = {
        id: 'user-1',
        nameID: 'old-name',
        email: 'test@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.count.mockResolvedValue(0);
      repository.save.mockResolvedValue(user);

      await service.updateUserPlatformSettings({
        userID: 'user-1',
        nameID: 'new-name',
      } as any);
      expect(user.nameID).toBe('new-name');
    });

    it('should not update nameID when same value', async () => {
      const user = {
        id: 'user-1',
        nameID: 'same-name',
        email: 'test@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.save.mockResolvedValue(user);

      await service.updateUserPlatformSettings({
        userID: 'user-1',
        nameID: 'same-name',
      } as any);
      expect(repository.count).not.toHaveBeenCalled();
    });

    it('should update email when new value provided', async () => {
      const user = {
        id: 'user-1',
        nameID: 'name',
        email: 'old@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      userLookupService.isRegisteredUser.mockResolvedValue(false);
      repository.save.mockResolvedValue(user);

      await service.updateUserPlatformSettings({
        userID: 'user-1',
        email: 'new@example.com',
      } as any);
      expect(user.email).toBe('new@example.com');
    });

    it('should normalize email to lowercase and trim', async () => {
      const user = {
        id: 'user-1',
        nameID: 'name',
        email: 'old@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      userLookupService.isRegisteredUser.mockResolvedValue(false);
      repository.save.mockResolvedValue(user);

      await service.updateUserPlatformSettings({
        userID: 'user-1',
        email: '  NEW@EXAMPLE.COM  ',
      } as any);
      expect(user.email).toBe('new@example.com');
    });

    it('should throw ValidationException when email already taken', async () => {
      const user = {
        id: 'user-1',
        nameID: 'name',
        email: 'old@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      userLookupService.isRegisteredUser.mockResolvedValue(true);

      await expect(
        service.updateUserPlatformSettings({
          userID: 'user-1',
          email: 'taken@example.com',
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should not update email when same value after normalization', async () => {
      const user = {
        id: 'user-1',
        nameID: 'name',
        email: 'test@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.save.mockResolvedValue(user);

      await service.updateUserPlatformSettings({
        userID: 'user-1',
        email: 'TEST@EXAMPLE.COM',
      } as any);
      // isRegisteredUser should not be called if emails match after normalization
      expect(userLookupService.isRegisteredUser).not.toHaveBeenCalled();
    });
  });

  describe('clearAuthenticationIDForUser', () => {
    it('should return user unchanged when authenticationID is falsy', async () => {
      const user = {
        id: 'user-1',
        authenticationID: null,
      } as unknown as IUser;
      const result = await service.clearAuthenticationIDForUser(user);
      expect(result).toBe(user);
    });

    it('should clear authenticationID and invalidate cache', async () => {
      const user = {
        id: 'user-1',
        authenticationID: 'auth-123',
      } as unknown as IUser;
      repository.save.mockResolvedValue({
        ...user,
        authenticationID: null,
      });
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.clearAuthenticationIDForUser(user);
      expect(user.authenticationID).toBeNull();
      expect(actorContextCacheService.deleteByActorID).toHaveBeenCalledWith(
        'user-1'
      );
    });
  });

  describe('clearAuthenticationIDById', () => {
    it('should get user by ID then clear authenticationID', async () => {
      const user = {
        id: 'user-1',
        authenticationID: 'auth-123',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.save.mockResolvedValue({
        ...user,
        authenticationID: null,
      });
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.clearAuthenticationIDById('user-1');
      expect(userLookupService.getUserById).toHaveBeenCalled();
    });
  });

  describe('getUsersForQuery', () => {
    it('should filter by credentials when provided', async () => {
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getUsersForQuery({
        filter: { credentials: ['cred-type'] as any },
      } as any);
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalled();
      expect(mockQb.getMany).toHaveBeenCalled();
    });

    it('should query non-service profiles when no credentials filter', async () => {
      repository.findBy.mockResolvedValue([]);
      await service.getUsersForQuery({} as any);
      expect(repository.findBy).toHaveBeenCalledWith({
        serviceProfile: false,
      });
    });

    it('should filter by IDs when provided', async () => {
      const users = [
        { id: 'u1', serviceProfile: false },
        { id: 'u2', serviceProfile: false },
        { id: 'u3', serviceProfile: false },
      ];
      repository.findBy.mockResolvedValue(users);

      const result = await service.getUsersForQuery({
        IDs: ['u1', 'u3'],
      } as any);
      expect(result).toHaveLength(2);
      expect(result.map((u: any) => u.id)).toEqual(['u1', 'u3']);
    });

    it('should respect limit parameter', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: `u${i}`,
        serviceProfile: false,
      }));
      repository.findBy.mockResolvedValue(users);

      const result = await service.getUsersForQuery({ limit: 3 } as any);
      expect(result).toHaveLength(3);
    });

    it('should default shuffle to false', async () => {
      repository.findBy.mockResolvedValue([{ id: 'u1' }]);
      const result = await service.getUsersForQuery({} as any);
      expect(result).toHaveLength(1);
    });
  });

  describe('getPaginatedUsers', () => {
    const createPaginationQb = () => {
      const qb: any = {
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
        take: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        clone: vi.fn(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        expressionMap: { orderBys: {} },
      };
      qb.clone.mockReturnValue(qb);
      return qb;
    };

    it('should create a query builder and return paginated results', async () => {
      const mockQb = createPaginationQb();
      repository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getPaginatedUsers({ first: 10 } as any);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(result).toBeDefined();
    });

    it('should add withTags filter when provided as true', async () => {
      const mockQb = createPaginationQb();
      repository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getPaginatedUsers({ first: 10 } as any, true);
      expect(mockQb.leftJoin).toHaveBeenCalled();
      expect(mockQb.where).toHaveBeenCalledWith(expect.stringContaining('!='));
    });

    it('should add withTags filter when provided as false', async () => {
      const mockQb = createPaginationQb();
      repository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getPaginatedUsers({ first: 10 } as any, false);
      expect(mockQb.where).toHaveBeenCalledWith(expect.stringContaining('='));
    });
  });

  describe('updateUser edge cases', () => {
    it('should throw ValidationException when new nameID is already taken', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'old-name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.count.mockResolvedValue(1);

      await expect(
        service.updateUser({ ID: 'user-1', nameID: 'taken-name' } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should not update profile when profileData is not provided', async () => {
      const existingUser = {
        id: 'user-1',
        nameID: 'name',
        profile: { id: 'profile-1' },
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(existingUser);
      actorContextCacheService.deleteByActorID.mockResolvedValue(undefined);

      await service.updateUser({ ID: 'user-1' } as any);
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('updateUserPlatformSettings edge cases', () => {
    it('should throw ValidationException when new nameID is already taken', async () => {
      const user = {
        id: 'user-1',
        nameID: 'old-name',
        email: 'test@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.count.mockResolvedValue(1);

      await expect(
        service.updateUserPlatformSettings({
          userID: 'user-1',
          nameID: 'taken-name',
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should not update when neither nameID nor email provided', async () => {
      const user = {
        id: 'user-1',
        nameID: 'name',
        email: 'test@example.com',
      } as unknown as IUser;
      userLookupService.getUserById.mockResolvedValue(user);
      repository.save.mockResolvedValue(user);

      const result = await service.updateUserPlatformSettings({
        userID: 'user-1',
      } as any);
      expect(result).toBeDefined();
      expect(repository.count).not.toHaveBeenCalled();
      expect(userLookupService.isRegisteredUser).not.toHaveBeenCalled();
    });
  });
});
