import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { UserSettingsHomeSpaceValidationService } from '../user-settings/user.settings.home.space.validation.service';
import { UserResolverMutations } from './user.resolver.mutations';
import { UserService } from './user.service';
import { UserAuthorizationService } from './user.service.authorization';

describe('UserResolverMutations', () => {
  let resolver: UserResolverMutations;
  let userService: {
    getUserByIdOrFail: Mock;
    updateUser: Mock;
    updateUserSettings: Mock;
    updateUserPlatformSettings: Mock;
    save: Mock;
  };
  let authorizationService: { grantAccessOrFail: Mock };
  let authorizationPolicyService: { saveAll: Mock };
  let userAuthorizationService: { applyAuthorizationPolicy: Mock };
  let homeSpaceValidationService: { validateSpaceAccess: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserResolverMutations, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(UserResolverMutations);
    userService = module.get(UserService) as any;
    authorizationService = module.get(AuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    userAuthorizationService = module.get(UserAuthorizationService) as any;
    homeSpaceValidationService = module.get(
      UserSettingsHomeSpaceValidationService
    ) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateUser', () => {
    it('should check UPDATE privilege and update user', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const updatedUser = { id: 'user-1', firstName: 'Updated' };

      userService.getUserByIdOrFail.mockResolvedValue(mockUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      userService.updateUser.mockResolvedValue(updatedUser);

      const actorContext = { actorID: 'user-1' } as any;
      const userData = { ID: 'user-1', firstName: 'Updated' };

      const result = await resolver.updateUser(actorContext, userData as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockUser.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(userService.updateUser).toHaveBeenCalledWith(userData);
      expect(result).toBe(updatedUser);
    });
  });

  describe('updateUserSettings', () => {
    it('should check UPDATE privilege, validate home space, and update settings', async () => {
      const mockUser = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
        settings: {},
      };
      const updatedUser = { id: 'user-1', settings: { homeSpace: {} } };
      const finalUser = { id: 'user-1' };
      const mockAuthorizations = [{ id: 'auth-2' }];

      userService.getUserByIdOrFail
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(finalUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      homeSpaceValidationService.validateSpaceAccess.mockResolvedValue(
        undefined
      );
      userService.updateUserSettings.mockResolvedValue(updatedUser);
      userService.save.mockResolvedValue(updatedUser);
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1' } as any;
      const settingsData = {
        userID: 'user-1',
        settings: {
          homeSpace: { spaceID: 'space-1' },
        },
      };

      const result = await resolver.updateUserSettings(
        actorContext,
        settingsData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        homeSpaceValidationService.validateSpaceAccess
      ).toHaveBeenCalledWith('space-1', actorContext);
      expect(userService.updateUserSettings).toHaveBeenCalled();
      expect(
        userAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result).toBe(finalUser);
    });

    it('should skip home space validation when no spaceID', async () => {
      const mockUser = {
        id: 'user-1',
        authorization: { id: 'auth-1' },
        settings: {},
      };
      const updatedUser = { id: 'user-1' };
      const mockAuthorizations = [{ id: 'auth-2' }];

      userService.getUserByIdOrFail
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      userService.updateUserSettings.mockResolvedValue(updatedUser);
      userService.save.mockResolvedValue(updatedUser);
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1' } as any;
      const settingsData = {
        userID: 'user-1',
        settings: { homeSpace: {} },
      };

      await resolver.updateUserSettings(actorContext, settingsData as any);

      expect(
        homeSpaceValidationService.validateSpaceAccess
      ).not.toHaveBeenCalled();
    });
  });

  describe('authorizationPolicyResetOnUser', () => {
    it('should check AUTHORIZATION_RESET privilege and reset policy', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const resetUser = { id: 'user-1' };
      const mockAuthorizations = [{ id: 'auth-2' }];

      userService.getUserByIdOrFail
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(resetUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        mockAuthorizations
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);

      const actorContext = { actorID: 'admin-1' } as any;
      const result = await resolver.authorizationPolicyResetOnUser(
        actorContext,
        { userID: 'user-1' } as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockUser.authorization,
        AuthorizationPrivilege.AUTHORIZATION_RESET,
        expect.any(String)
      );
      expect(result).toBe(resetUser);
    });
  });

  describe('updateUserPlatformSettings', () => {
    it('should check PLATFORM_ADMIN privilege and update settings', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const updatedUser = { id: 'user-1', nameID: 'new-name' };

      userService.getUserByIdOrFail.mockResolvedValue(mockUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      userService.updateUserPlatformSettings.mockResolvedValue(updatedUser);

      const actorContext = { actorID: 'admin-1' } as any;
      const updateData = { userID: 'user-1', nameID: 'new-name' };

      const result = await resolver.updateUserPlatformSettings(
        actorContext,
        updateData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockUser.authorization,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(result).toBe(updatedUser);
    });
  });
});
