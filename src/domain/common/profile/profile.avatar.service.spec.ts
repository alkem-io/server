import { LogContext } from '@common/enums/logging.context';
import { VisualType } from '@common/enums/visual.type';
import { ProfileService } from '@domain/common/profile/profile.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock } from 'vitest';
import { CreateProfileInput } from './dto';
import { ProfileAvatarService } from './profile.avatar.service';
import { IProfile } from './profile.interface';

describe('ProfileAvatarService', () => {
  let service: ProfileAvatarService;
  let profileService: ProfileService;
  let avatarCreatorService: AvatarCreatorService;
  let storageBucketService: StorageBucketService;
  let logger: { error: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileAvatarService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ProfileAvatarService);
    profileService = module.get(ProfileService);
    avatarCreatorService = module.get(AvatarCreatorService);
    storageBucketService = module.get(StorageBucketService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  describe('addAvatarVisualToProfile', () => {
    const profile = { id: 'profile-1' } as IProfile;

    it('should use explicit avatar URL from profile data when valid HTTP URL', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test User',
        visuals: [
          { name: VisualType.AVATAR, uri: 'https://example.com/avatar.png' },
        ],
      };

      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(profile, profileData);

      expect(profileService.addVisualsOnProfile).toHaveBeenCalledWith(
        profile,
        [{ name: VisualType.AVATAR, uri: 'https://example.com/avatar.png' }],
        [VisualType.AVATAR]
      );
    });

    it('should use Kratos avatar URL when profile data has no valid avatar', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test User',
      };
      const kratosData = {
        avatarURL: 'https://kratos.example.com/photo.jpg',
      } as any;

      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(profile, profileData, kratosData);

      expect(profileService.addVisualsOnProfile).toHaveBeenCalledWith(
        profile,
        [
          {
            name: VisualType.AVATAR,
            uri: 'https://kratos.example.com/photo.jpg',
          },
        ],
        [VisualType.AVATAR]
      );
    });

    it('should generate random avatar when no valid URLs available', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test User',
      };

      (avatarCreatorService.generateRandomAvatarURL as Mock).mockReturnValue(
        'https://generated.example.com/avatar.svg'
      );
      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(profile, profileData);

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalledWith(
        'Test User',
        undefined
      );
    });

    it('should use firstName for generated avatar when provided', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test User',
      };

      (avatarCreatorService.generateRandomAvatarURL as Mock).mockReturnValue(
        'https://generated.example.com/avatar.svg'
      );
      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(
        profile,
        profileData,
        undefined,
        'John',
        'Doe'
      );

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalledWith(
        'John',
        'Doe'
      );
    });

    it('should reject invalid URLs and fall back to generated avatar', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test',
        visuals: [{ name: VisualType.AVATAR, uri: 'not-a-valid-url' }],
      };

      (avatarCreatorService.generateRandomAvatarURL as Mock).mockReturnValue(
        'https://generated.example.com/avatar.svg'
      );
      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(profile, profileData);

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalled();
    });

    it('should reject ftp URLs and fall back to generated avatar', async () => {
      const profileData: CreateProfileInput = {
        displayName: 'Test',
        visuals: [
          { name: VisualType.AVATAR, uri: 'ftp://example.com/avatar.png' },
        ],
      };

      (avatarCreatorService.generateRandomAvatarURL as Mock).mockReturnValue(
        'https://generated.example.com/avatar.svg'
      );
      (profileService.addVisualsOnProfile as Mock).mockResolvedValue(undefined);

      await service.addAvatarVisualToProfile(profile, profileData);

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalled();
    });
  });

  describe('ensureAvatarIsStoredInLocalStorageBucket', () => {
    const buildProfile = (uri: string) =>
      ({
        id: 'profile-1',
        visuals: [{ name: VisualType.AVATAR, uri }],
        storageBucket: { id: 'bucket-1' },
      }) as unknown as IProfile;

    it('should log the failure with LogContext as the context argument and the stack as the trace', async () => {
      const profile = buildProfile('https://media.licdn.com/dms/image/v2/abc');
      const downloadError: any = new Error(
        'Request failed with status code 403'
      );
      downloadError.httpStatus = 403;

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);
      (profileService.save as Mock).mockResolvedValue(profile);
      (
        storageBucketService.ensureAvatarUrlIsDocument as Mock
      ).mockRejectedValue(downloadError);

      await service.ensureAvatarIsStoredInLocalStorageBucket('profile-1');

      expect(logger.error).toHaveBeenCalledTimes(1);
      const [message, trace, context] = logger.error.mock.calls[0];
      expect(context).toBe(LogContext.COMMUNITY);
      expect(trace).toBe(downloadError.stack);
      expect(message).toMatchObject({
        msg: 'AVATAR_NOT_STORED_LOCALLY',
        profileID: 'profile-1',
        avatarHost: 'media.licdn.com',
        httpStatus: 403,
      });
    });

    it('should leave the external avatar URI in place when the download fails', async () => {
      const uri = 'https://media.licdn.com/dms/image/v2/abc';
      const profile = buildProfile(uri);

      (profileService.getProfileOrFail as Mock).mockResolvedValue(profile);
      (profileService.save as Mock).mockResolvedValue(profile);
      (
        storageBucketService.ensureAvatarUrlIsDocument as Mock
      ).mockRejectedValue(new Error('boom'));

      await service.ensureAvatarIsStoredInLocalStorageBucket('profile-1');

      expect(profile.visuals?.[0].uri).toBe(uri);
    });
  });
});
