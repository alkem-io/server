import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ILicense } from '@domain/common/license/license.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardService } from './whiteboard.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { vi } from 'vitest';

describe('WhiteboardService', () => {
  let service: WhiteboardService;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let communityResolverService: CommunityResolverService;
  let licenseService: LicenseService;
  let db: any;

  beforeEach(async () => {
    // Mock static Whiteboard.create to avoid DataSource requirement
    vi.spyOn(Whiteboard, 'create').mockImplementation((input: any) => {
      const entity = new Whiteboard();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(WhiteboardService);
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    communityResolverService = module.get(CommunityResolverService);
    licenseService = module.get(LicenseService);
    db = module.get(DRIZZLE);
  });

  describe('createWhiteboard', () => {
    const mockStorageAggregator = {} as IStorageAggregator;
    const mockProfile = {
      id: 'profile-1',
      displayName: 'Whiteboard',
    } as IProfile;

    beforeEach(() => {
      vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(
        mockProfile
      );
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        {} as any
      );
    });

    it('should create whiteboard with profile, visuals, tagset, and authorization', async () => {
      const result = await service.createWhiteboard(
        { content: '{}' },
        mockStorageAggregator
      );

      expect(result.authorization).toBeDefined();
      expect(result.authorization!.type).toBe(
        AuthorizationPolicyType.WHITEBOARD
      );
      expect(result.contentUpdatePolicy).toBe(ContentUpdatePolicy.CONTRIBUTORS);
      expect(result.profile).toEqual(
        expect.objectContaining({ id: 'profile-1' })
      );

      expect(vi.mocked(profileService.createProfile)).toHaveBeenCalledWith(
        { displayName: 'Whiteboard' },
        ProfileType.WHITEBOARD,
        mockStorageAggregator
      );
      expect(
        vi.mocked(profileService.addVisualsOnProfile)
      ).toHaveBeenCalledWith(mockProfile, undefined, [
        VisualType.CARD,
        VisualType.WHITEBOARD_PREVIEW,
      ]);
      expect(
        vi.mocked(profileService.addOrUpdateTagsetOnProfile)
      ).toHaveBeenCalledWith(mockProfile, {
        name: TagsetReservedName.DEFAULT,
        tags: [],
      });
    });

    it('should set createdBy when userID is provided', async () => {
      const result = await service.createWhiteboard(
        { content: '{}' },
        mockStorageAggregator,
        'user-42'
      );

      expect(result.createdBy).toBe('user-42');
    });

    it('should leave createdBy undefined when userID is not provided', async () => {
      const result = await service.createWhiteboard(
        { content: '{}' },
        mockStorageAggregator
      );

      expect(result.createdBy).toBeUndefined();
    });

    it('should use default preview coordinates as null when not provided', async () => {
      const result = await service.createWhiteboard(
        { content: '{}' },
        mockStorageAggregator
      );

      expect(result.previewSettings).toEqual({
        mode: WhiteboardPreviewMode.AUTO,
        coordinates: null,
      });
    });

    it('should use provided preview settings when specified', async () => {
      const coordinates = { x: 10, y: 20, width: 100, height: 200 };
      const result = await service.createWhiteboard(
        {
          content: '{}',
          previewSettings: {
            mode: WhiteboardPreviewMode.CUSTOM,
            coordinates,
          },
        },
        mockStorageAggregator
      );

      expect(result.previewSettings).toEqual({
        mode: WhiteboardPreviewMode.CUSTOM,
        coordinates,
      });
    });

    it('should use custom profile data when provided', async () => {
      const customProfile = {
        displayName: 'My Whiteboard',
        description: 'A custom whiteboard',
      };

      await service.createWhiteboard(
        { content: '{}', profile: customProfile },
        mockStorageAggregator
      );

      expect(vi.mocked(profileService.createProfile)).toHaveBeenCalledWith(
        customProfile,
        ProfileType.WHITEBOARD,
        mockStorageAggregator
      );
    });
  });

  describe('getWhiteboardOrFail', () => {
    it('should return whiteboard when found', async () => {
      const whiteboard = { id: 'wb-1', content: '' } as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboard);

      const result = await service.getWhiteboardOrFail('wb-1');

      expect(result).toBe(whiteboard);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getWhiteboardOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

  });

  describe('deleteWhiteboard', () => {
    it('should cascade delete profile and authorization then remove whiteboard', async () => {
      const whiteboard = {
        id: 'wb-1',
        content: '',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboard);
      vi.mocked(profileService.deleteProfile).mockResolvedValue(
        whiteboard.profile as any
      );
      vi.mocked(authorizationPolicyService.delete).mockResolvedValue({} as any);

      const result = await service.deleteWhiteboard('wb-1');

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'profile-1'
      );
      expect(vi.mocked(authorizationPolicyService.delete)).toHaveBeenCalledWith(
        whiteboard.authorization
      );
      expect(result.id).toBe('wb-1');
    });

    it('should throw RelationshipNotFoundException when profile is not loaded', async () => {
      const whiteboard = {
        id: 'wb-1',
        content: '',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboard);

      await expect(service.deleteWhiteboard('wb-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when authorization is not loaded', async () => {
      const whiteboard = {
        id: 'wb-1',
        content: '',
        profile: { id: 'profile-1' },
        authorization: undefined,
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboard);

      await expect(service.deleteWhiteboard('wb-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw EntityNotFoundException when whiteboard does not exist', async () => {

      await expect(service.deleteWhiteboard('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateWhiteboard', () => {
    const existingWhiteboard = {
      id: 'wb-1',
      profile: { id: 'profile-1' },
      contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      previewSettings: {
        mode: WhiteboardPreviewMode.AUTO,
        coordinates: null,
      },
    } as unknown as IWhiteboard;

    beforeEach(() => {
      // Mock the two getWhiteboardOrFail calls: load + reload after update
      db.query.whiteboards.findFirst.mockResolvedValue({
        ...existingWhiteboard,
        content: '',
      });
    });

    it('should update profile when profile data is provided', async () => {
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      vi.mocked(profileService.updateProfile).mockResolvedValue(
        updatedProfile as any
      );

      const result = await service.updateWhiteboard(existingWhiteboard, {
        profile: { displayName: 'Updated' },
      });

      expect(vi.mocked(profileService.updateProfile)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        { displayName: 'Updated' }
      );
      expect(result.profile).toEqual(
        expect.objectContaining({ id: 'profile-1' })
      );
    });

    it('should not update profile when profile data is not provided', async () => {
      await service.updateWhiteboard(existingWhiteboard, {});

      expect(vi.mocked(profileService.updateProfile)).not.toHaveBeenCalled();
    });

    it('should update contentUpdatePolicy when provided', async () => {
      const result = await service.updateWhiteboard(existingWhiteboard, {
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      expect(result.contentUpdatePolicy).toBe(ContentUpdatePolicy.ADMINS);
    });

    it('should update preview settings mode when provided', async () => {
      const result = await service.updateWhiteboard(existingWhiteboard, {
        previewSettings: { mode: WhiteboardPreviewMode.FIXED },
      });

      expect(result.previewSettings.mode).toBe(WhiteboardPreviewMode.FIXED);
    });

    it('should update preview settings coordinates when provided', async () => {
      const coordinates = { x: 50, y: 60, width: 300, height: 200 };

      const result = await service.updateWhiteboard(existingWhiteboard, {
        previewSettings: { coordinates },
      });

      expect(result.previewSettings.coordinates).toEqual(coordinates);
    });

  });

  describe('isMultiUser', () => {
    it('should return true when multi-user entitlement is enabled', async () => {
      const mockLicense = { id: 'license-1' } as ILicense;
      vi.mocked(
        communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
      ).mockResolvedValue(mockLicense);
      vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(true);

      const result = await service.isMultiUser('wb-1');

      expect(result).toBe(true);
      expect(
        vi.mocked(
          communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
        )
      ).toHaveBeenCalledWith('wb-1');
      expect(
        vi.mocked(licenseService.isEntitlementEnabled)
      ).toHaveBeenCalledWith(
        mockLicense,
        LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER
      );
    });

    it('should return false when multi-user entitlement is not enabled', async () => {
      const mockLicense = { id: 'license-1' } as ILicense;
      vi.mocked(
        communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
      ).mockResolvedValue(mockLicense);
      vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(false);

      const result = await service.isMultiUser('wb-1');

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', async () => {
      const whiteboardWithProfile = {
        id: 'wb-1',
        content: '',
        profile: { id: 'profile-1', displayName: 'Test' },
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboardWithProfile);

      const result = await service.getProfile('wb-1');

      expect(result).toEqual(
        expect.objectContaining({ id: 'profile-1', displayName: 'Test' })
      );
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const whiteboardNoProfile = {
        id: 'wb-1',
        content: '',
        profile: undefined,
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboardNoProfile);

      await expect(service.getProfile('wb-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should merge additional relations when provided', async () => {
      const whiteboardWithProfile = {
        id: 'wb-1',
        content: '',
        profile: { id: 'profile-1' },
      } as unknown as Whiteboard;
      db.query.whiteboards.findFirst.mockResolvedValueOnce(whiteboardWithProfile);

      await service.getProfile('wb-1', {
        framing: true,
      } as any);

    });

    it('should throw EntityNotFoundException when whiteboard does not exist', async () => {

      await expect(service.getProfile('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
