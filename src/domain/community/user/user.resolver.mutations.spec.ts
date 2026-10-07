import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
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
  let platformAuthorizationPolicyService: {
    getPlatformAuthorizationPolicy: Mock;
  };
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
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
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
      // 027-platform-role-redesign (T052): actorContext now passed through
      // for the SET_SERVICE_PROFILE check.
      expect(userService.updateUser).toHaveBeenCalledWith(
        userData,
        actorContext
      );
      expect(result).toBe(updatedUser);
    });

    // 027-platform-role-redesign (A21 fix, FR-002/FR-003): a serviceProfile-only
    // call is Platform Roles Admin's sole-owned surface and must reach
    // UserService.updateUser (where SET_SERVICE_PROFILE is enforced too, as
    // defense in depth) WITHOUT requiring the ordinary UPDATE privilege the
    // role does not hold.
    //
    // sec-server-11 fix: the resolver now gates SET_SERVICE_PROFILE itself,
    // against the PLATFORM authorization policy, before delegating — rather
    // than skipping authorization entirely.
    it('should check SET_SERVICE_PROFILE (not UPDATE) for a serviceProfile-only update', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const updatedUser = { id: 'user-1', serviceProfile: true };
      const mockPlatformAuthorization = { id: 'platform-auth' };

      userService.getUserByIdOrFail.mockResolvedValue(mockUser);
      userService.updateUser.mockResolvedValue(updatedUser);
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        mockPlatformAuthorization
      );
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);

      const actorContext = { actorID: 'roles-admin-1' } as any;
      const userData = { ID: 'user-1', serviceProfile: true };

      const result = await resolver.updateUser(actorContext, userData as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockPlatformAuthorization,
        AuthorizationPrivilege.SET_SERVICE_PROFILE,
        expect.any(String)
      );
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        actorContext,
        mockUser.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(userService.updateUser).toHaveBeenCalledWith(
        userData,
        actorContext
      );
      expect(result).toBe(updatedUser);
    });

    // sec-server-11 fix: an unprivileged/anonymous caller is rejected right
    // here, with NO call to UserService.updateUser (so no redundant DB
    // lookup and no fail-closed rejection-audit write is even attempted).
    it('rejects an unprivileged serviceProfile-only caller before delegating to UserService', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const mockPlatformAuthorization = { id: 'platform-auth' };

      userService.getUserByIdOrFail.mockResolvedValue(mockUser);
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        mockPlatformAuthorization
      );
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      const actorContext = { actorID: '' } as any;
      const userData = { ID: 'user-1', serviceProfile: true };

      await expect(
        resolver.updateUser(actorContext, userData as any)
      ).rejects.toThrow('Forbidden');

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should still require UPDATE when serviceProfile is combined with another field', async () => {
      const mockUser = { id: 'user-1', authorization: { id: 'auth-1' } };
      const updatedUser = { id: 'user-1' };

      userService.getUserByIdOrFail.mockResolvedValue(mockUser);
      authorizationService.grantAccessOrFail.mockResolvedValue(undefined);
      userService.updateUser.mockResolvedValue(updatedUser);

      const actorContext = { actorID: 'user-1' } as any;
      const userData = {
        ID: 'user-1',
        serviceProfile: true,
        firstName: 'Updated',
      };

      await resolver.updateUser(actorContext, userData as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockUser.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
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

  // 027-platform-role-redesign (T078, FR-020): the `updateUserPlatformSettings`
  // suites are gone with the mutation. `nameID` is covered by the actor
  // service's `updateNameID`; `email` has no replacement by design — writing
  // user.email directly was the bug FR-020 removes.
});
