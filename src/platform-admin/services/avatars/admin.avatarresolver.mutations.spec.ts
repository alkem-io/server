import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AdminSearchContributorsMutations } from './admin.avatarresolver.mutations';

describe('AdminSearchContributorsMutations', () => {
  let resolver: AdminSearchContributorsMutations;
  let authorizationService: Record<string, Mock>;
  let platformAuthorizationPolicyService: Record<string, Mock>;
  let profileAvatarService: Record<string, Mock>;
  let profileService: Record<string, Mock>;
  let storageBucketAuthorizationService: Record<string, Mock>;
  let authorizationPolicyService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminSearchContributorsMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminSearchContributorsMutations);
    authorizationService = module.get(AuthorizationService) as any;
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    profileAvatarService = module.get(ProfileAvatarService) as any;
    profileService = module.get(ProfileService) as any;
    storageBucketAuthorizationService = module.get(
      StorageBucketAuthorizationService
    ) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminUpdateContributorAvatars', () => {
    it('should update avatar and apply authorization policy', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const initialProfile = { id: 'profile-1' };
      const fullProfile = {
        id: 'profile-1',
        storageBucket: {
          documents: [],
        },
        authorization: { id: 'auth-1' },
      };
      const authorizations = [{ id: 'updated-auth' }];
      const finalProfile = { id: 'profile-1', displayName: 'test' };

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket.mockResolvedValue(
        initialProfile
      );
      profileService.getProfileOrFail
        .mockResolvedValueOnce(fullProfile)
        .mockResolvedValueOnce(finalProfile);
      storageBucketAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        authorizations
      );

      const result = await resolver.adminUpdateContributorAvatars(
        actorContext,
        'profile-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(
        profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket
      ).toHaveBeenCalledWith('profile-1', 'actor-1');
      expect(
        storageBucketAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        fullProfile.storageBucket,
        fullProfile.authorization
      );
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith(
        authorizations
      );
      expect(result).toEqual(finalProfile);
    });

    it('should throw when storageBucket is missing', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const initialProfile = { id: 'profile-1' };
      const fullProfile = {
        id: 'profile-1',
        storageBucket: null,
        authorization: { id: 'auth-1' },
      };

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket.mockResolvedValue(
        initialProfile
      );
      profileService.getProfileOrFail.mockResolvedValue(fullProfile);

      await expect(
        resolver.adminUpdateContributorAvatars(actorContext, 'profile-1')
      ).rejects.toThrow();
    });

    it('should throw when authorization is missing', async () => {
      const platformPolicy = { id: 'platform-auth' };
      const initialProfile = { id: 'profile-1' };
      const fullProfile = {
        id: 'profile-1',
        storageBucket: { documents: [] },
        authorization: null,
      };

      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket.mockResolvedValue(
        initialProfile
      );
      profileService.getProfileOrFail.mockResolvedValue(fullProfile);

      await expect(
        resolver.adminUpdateContributorAvatars(actorContext, 'profile-1')
      ).rejects.toThrow();
    });
  });
});
