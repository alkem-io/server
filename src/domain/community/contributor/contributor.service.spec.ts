import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { VisualType } from '@common/enums/visual.type';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi, type Mock } from 'vitest';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Organization } from '../organization/organization.entity';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { ContributorService } from './contributor.service';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentService } from '@domain/storage/document/document.service';

describe('ContributorService', () => {
  let service: ContributorService;
  let contributorLookupService: {
    getContributorByUUID: Mock;
  };
  let profileService: {
    getProfileOrFail: Mock;
    addVisualsOnProfile: Mock;
    save: Mock;
  };
  let avatarCreatorService: {
    generateRandomAvatarURL: Mock;
  };
  let storageBucketService: {
    ensureAvatarUrlIsDocument: Mock;
  };
  let documentService: {
    getPubliclyAccessibleURL: Mock;
  };
  let entityManager: {
    findOne: Mock;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ContributorService);
    contributorLookupService = module.get(ContributorLookupService) as any;
    profileService = module.get(ProfileService) as any;
    avatarCreatorService = module.get(AvatarCreatorService) as any;
    storageBucketService = module.get(StorageBucketService) as any;
    documentService = module.get(DocumentService) as any;
  });

  describe('getContributor', () => {
    it('should delegate to contributorLookupService.getContributorByUUID', async () => {
      const mockContributor = { id: 'c-1' };
      contributorLookupService.getContributorByUUID.mockResolvedValue(mockContributor);

      const result = await service.getContributor('c-1');

      expect(result).toBe(mockContributor);
      expect(contributorLookupService.getContributorByUUID).toHaveBeenCalledWith('c-1', undefined);
    });
  });

  describe('getContributorByUuidOrFail', () => {
    it('should return contributor when found', async () => {
      const mockContributor = { id: 'c-1' };
      contributorLookupService.getContributorByUUID.mockResolvedValue(mockContributor);

      const result = await service.getContributorByUuidOrFail('c-1');
      expect(result).toBe(mockContributor);
    });

    it('should throw EntityNotFoundException when contributor is not found', async () => {
      contributorLookupService.getContributorByUUID.mockResolvedValue(null);

      await expect(
        service.getContributorByUuidOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getContributorAndAgent', () => {
    it('should return contributor and agent when agent is initialized', async () => {
      const mockAgent = { id: 'agent-1' };
      const mockContributor = { id: 'c-1', agent: mockAgent };
      contributorLookupService.getContributorByUUID.mockResolvedValue(mockContributor);

      const result = await service.getContributorAndAgent('c-1');

      expect(result.contributor).toBe(mockContributor);
      expect(result.agent).toBe(mockAgent);
    });

    it('should throw EntityNotInitializedException when agent is not initialized', async () => {
      const mockContributor = { id: 'c-1', agent: undefined };
      contributorLookupService.getContributorByUUID.mockResolvedValue(mockContributor);

      await expect(
        service.getContributorAndAgent('c-1')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotFoundException when contributor does not exist', async () => {
      contributorLookupService.getContributorByUUID.mockResolvedValue(null);

      await expect(
        service.getContributorAndAgent('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('addAvatarVisualToContributorProfile', () => {
    it('should use explicitly provided avatar URL from profile data when it is a valid HTTP URL', async () => {
      const profile = { id: 'profile-1' } as any;
      const profileData = {
        displayName: 'Test',
        visuals: [{ name: VisualType.AVATAR, uri: 'https://example.com/avatar.png' }],
      } as any;
      profileService.addVisualsOnProfile.mockResolvedValue(undefined);

      await service.addAvatarVisualToContributorProfile(profile, profileData);

      expect(profileService.addVisualsOnProfile).toHaveBeenCalledWith(
        profile,
        expect.arrayContaining([
          expect.objectContaining({
            name: VisualType.AVATAR,
            uri: 'https://example.com/avatar.png',
          }),
        ]),
        [VisualType.AVATAR]
      );
    });

    it('should use agent avatar URL when profile avatar is not a valid URL', async () => {
      const profile = { id: 'profile-1' } as any;
      const profileData = {
        displayName: 'Test',
        visuals: [{ name: VisualType.AVATAR, uri: 'not-a-url' }],
      } as any;
      const agentInfo = { avatarURL: 'https://agent.com/avatar.png' } as any;
      profileService.addVisualsOnProfile.mockResolvedValue(undefined);

      await service.addAvatarVisualToContributorProfile(profile, profileData, agentInfo);

      expect(profileService.addVisualsOnProfile).toHaveBeenCalledWith(
        profile,
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'https://agent.com/avatar.png',
          }),
        ]),
        [VisualType.AVATAR]
      );
    });

    it('should generate a random avatar when neither profile nor agent provides a valid URL', async () => {
      const profile = { id: 'profile-1' } as any;
      const profileData = {
        displayName: 'Test User',
        visuals: [],
      } as any;
      avatarCreatorService.generateRandomAvatarURL.mockReturnValue('https://generated.com/avatar.png');
      profileService.addVisualsOnProfile.mockResolvedValue(undefined);

      await service.addAvatarVisualToContributorProfile(profile, profileData);

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalledWith(
        'Test User',
        undefined
      );
    });

    it('should use firstName and lastName for avatar generation when provided', async () => {
      const profile = { id: 'profile-1' } as any;
      const profileData = {
        displayName: 'Display Name',
        visuals: [],
      } as any;
      avatarCreatorService.generateRandomAvatarURL.mockReturnValue('https://generated.com/avatar.png');
      profileService.addVisualsOnProfile.mockResolvedValue(undefined);

      await service.addAvatarVisualToContributorProfile(
        profile, profileData, undefined, 'John', 'Doe'
      );

      expect(avatarCreatorService.generateRandomAvatarURL).toHaveBeenCalledWith(
        'John',
        'Doe'
      );
    });
  });

  describe('ensureAvatarIsStoredInLocalStorageBucket', () => {
    it('should update avatar visual URI and save profile when storage succeeds', async () => {
      const avatarVisual = { name: VisualType.AVATAR, uri: 'https://old.com/avatar.png' };
      const mockProfile = {
        id: 'profile-1',
        visuals: [avatarVisual],
        storageBucket: { id: 'bucket-1' },
      };
      profileService.getProfileOrFail.mockResolvedValue(mockProfile);
      const mockDocument = { id: 'doc-1' };
      storageBucketService.ensureAvatarUrlIsDocument.mockResolvedValue(mockDocument);
      documentService.getPubliclyAccessibleURL.mockReturnValue('https://local.com/avatar.png');
      profileService.save.mockResolvedValue(mockProfile);

      const result = await service.ensureAvatarIsStoredInLocalStorageBucket('profile-1', 'user-1');

      expect(avatarVisual.uri).toBe('https://local.com/avatar.png');
      expect(profileService.save).toHaveBeenCalledWith(mockProfile);
      expect(result).toBe(mockProfile);
    });

    it('should still save profile when avatar storage fails (graceful error handling)', async () => {
      const mockProfile = {
        id: 'profile-1',
        visuals: [],
        storageBucket: { id: 'bucket-1' },
      };
      profileService.getProfileOrFail.mockResolvedValue(mockProfile);
      profileService.save.mockResolvedValue(mockProfile);

      // No avatar visual found - will throw internally but catch it
      const result = await service.ensureAvatarIsStoredInLocalStorageBucket('profile-1');

      expect(profileService.save).toHaveBeenCalledWith(mockProfile);
      expect(result).toBe(mockProfile);
    });

    it('should handle missing visuals on profile gracefully', async () => {
      const mockProfile = {
        id: 'profile-1',
        visuals: undefined,
        storageBucket: { id: 'bucket-1' },
      };
      profileService.getProfileOrFail.mockResolvedValue(mockProfile);
      profileService.save.mockResolvedValue(mockProfile);

      const result = await service.ensureAvatarIsStoredInLocalStorageBucket('profile-1');

      expect(profileService.save).toHaveBeenCalled();
      expect(result).toBe(mockProfile);
    });
  });

  describe('getContributorWithRelations', () => {
    it('should query the User entity when contributor is a User instance', async () => {
      const userContributor = Object.create(User.prototype);
      userContributor.id = 'user-1';

      const mockUser = { id: 'user-1', profile: { id: 'p-1' } };
      entityManager.findOne.mockResolvedValue(mockUser);

      const result = await service.getContributorWithRelations(userContributor);

      expect(entityManager.findOne).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          where: { id: 'user-1' },
        })
      );
      expect(result).toBe(mockUser);
    });

    it('should query the Organization entity when contributor is an Organization instance', async () => {
      const orgContributor = Object.create(Organization.prototype);
      orgContributor.id = 'org-1';

      const mockOrg = { id: 'org-1' };
      entityManager.findOne.mockResolvedValue(mockOrg);

      const result = await service.getContributorWithRelations(orgContributor);

      expect(entityManager.findOne).toHaveBeenCalledWith(
        Organization,
        expect.objectContaining({
          where: { id: 'org-1' },
        })
      );
      expect(result).toBe(mockOrg);
    });

    it('should query the VirtualContributor entity when contributor is a VirtualContributor instance', async () => {
      const vcContributor = Object.create(VirtualContributor.prototype);
      vcContributor.id = 'vc-1';

      const mockVC = { id: 'vc-1' };
      entityManager.findOne.mockResolvedValue(mockVC);

      const result = await service.getContributorWithRelations(vcContributor);

      expect(entityManager.findOne).toHaveBeenCalledWith(
        VirtualContributor,
        expect.objectContaining({
          where: { id: 'vc-1' },
        })
      );
      expect(result).toBe(mockVC);
    });

    it('should throw RelationshipNotFoundException when entity is not found after query', async () => {
      const userContributor = Object.create(User.prototype);
      userContributor.id = 'user-1';

      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getContributorWithRelations(userContributor)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
