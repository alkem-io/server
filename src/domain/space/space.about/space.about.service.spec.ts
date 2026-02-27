import { VisualType } from '@common/enums/visual.type';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { SpaceAbout } from './space.about.entity';
import { ISpaceAbout } from './space.about.interface';
import { SpaceAboutService } from './space.about.service';

describe('SpaceAboutService', () => {
  let service: SpaceAboutService;
  let spaceAboutRepository: Repository<SpaceAbout>;
  let profileService: ProfileService;
  let communityGuidelinesService: CommunityGuidelinesService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let spaceLookupService: SpaceLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceAboutService,
        repositoryProviderMockFactory(SpaceAbout),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceAboutService);
    spaceAboutRepository = module.get<Repository<SpaceAbout>>(
      getRepositoryToken(SpaceAbout)
    );
    profileService = module.get(ProfileService);
    communityGuidelinesService = module.get(CommunityGuidelinesService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    spaceLookupService = module.get(SpaceLookupService);
  });

  describe('getSpaceAboutOrFail', () => {
    it('should return space about when found', async () => {
      // Arrange
      const mockAbout = { id: 'about-1' } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(mockAbout);

      // Act
      const result = await service.getSpaceAboutOrFail('about-1');

      // Assert
      expect(result).toBe(mockAbout);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      // Arrange
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSpaceAboutOrFail('missing-id')).rejects.toThrow(
        'No SpaceAbout found with the given id: missing-id'
      );
    });
  });

  describe('updateSpaceAbout', () => {
    it('should update why and who fields when provided', async () => {
      // Arrange
      const existingAbout = {
        id: 'about-1',
        why: 'old why',
        who: 'old who',
        profile: { id: 'profile-1' },
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        existingAbout
      );
      vi.spyOn(spaceAboutRepository, 'save').mockImplementation(
        async entity => entity as SpaceAbout
      );

      const updateData = {
        why: 'new why',
        who: 'new who',
      };

      // Act
      const result = await service.updateSpaceAbout(existingAbout, updateData);

      // Assert
      expect(result.why).toBe('new why');
      expect(result.who).toBe('new who');
    });

    it('should preserve why when not provided in update', async () => {
      // Arrange
      const existingAbout = {
        id: 'about-1',
        why: 'existing why',
        who: 'existing who',
        profile: { id: 'profile-1' },
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        existingAbout
      );
      vi.spyOn(spaceAboutRepository, 'save').mockImplementation(
        async entity => entity as SpaceAbout
      );

      const updateData = { who: 'updated who' };

      // Act
      const result = await service.updateSpaceAbout(existingAbout, updateData);

      // Assert
      expect(result.why).toBe('existing why');
      expect(result.who).toBe('updated who');
    });

    it('should update profile when profile data is provided', async () => {
      // Arrange
      const existingProfile = { id: 'profile-1' };
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      const existingAbout = {
        id: 'about-1',
        why: 'why',
        who: 'who',
        profile: existingProfile,
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        existingAbout
      );
      vi.spyOn(spaceAboutRepository, 'save').mockImplementation(
        async entity => entity as SpaceAbout
      );
      profileService.updateProfile = vi.fn().mockResolvedValue(updatedProfile);

      const updateData = {
        profile: { displayName: 'Updated' } as any,
      };

      // Act
      const result = await service.updateSpaceAbout(existingAbout, updateData);

      // Assert
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        existingProfile,
        updateData.profile
      );
      expect(result.profile).toBe(updatedProfile);
    });

    it('should not update profile when no profile data is provided', async () => {
      // Arrange
      const existingAbout = {
        id: 'about-1',
        why: 'why',
        who: 'who',
        profile: { id: 'profile-1' },
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        existingAbout
      );
      vi.spyOn(spaceAboutRepository, 'save').mockImplementation(
        async entity => entity as SpaceAbout
      );

      const updateData = { why: 'new why' };

      // Act
      await service.updateSpaceAbout(existingAbout, updateData);

      // Assert
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('removeSpaceAbout', () => {
    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      // Arrange
      const aboutWithoutProfile = {
        id: 'about-1',
        profile: undefined,
        guidelines: { id: 'guide-1' },
      } as unknown as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        aboutWithoutProfile
      );

      // Act & Assert
      await expect(service.removeSpaceAbout('about-1')).rejects.toThrow(
        'Unable to load all entities for SpaceAbout: about-1'
      );
    });

    it('should throw RelationshipNotFoundException when guidelines are missing', async () => {
      // Arrange
      const aboutWithoutGuidelines = {
        id: 'about-1',
        profile: { id: 'profile-1' },
        guidelines: undefined,
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(
        aboutWithoutGuidelines
      );

      // Act & Assert
      await expect(service.removeSpaceAbout('about-1')).rejects.toThrow(
        'Unable to load all entities for SpaceAbout: about-1'
      );
    });

    it('should delete profile, guidelines, authorization, and the entity itself', async () => {
      // Arrange
      const about = {
        id: 'about-1',
        profile: { id: 'profile-1' },
        guidelines: { id: 'guide-1' },
        authorization: { id: 'auth-1' },
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(about);
      profileService.deleteProfile = vi.fn().mockResolvedValue(undefined);
      communityGuidelinesService.deleteCommunityGuidelines = vi
        .fn()
        .mockResolvedValue(undefined);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(spaceAboutRepository, 'remove').mockResolvedValue(about);

      // Act
      await service.removeSpaceAbout('about-1');

      // Assert
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(
        communityGuidelinesService.deleteCommunityGuidelines
      ).toHaveBeenCalledWith('guide-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        about.authorization
      );
      expect(spaceAboutRepository.remove).toHaveBeenCalledWith(about);
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      // Arrange
      const about = {
        id: 'about-1',
        profile: { id: 'profile-1' },
        guidelines: { id: 'guide-1' },
        authorization: undefined,
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(about);
      profileService.deleteProfile = vi.fn().mockResolvedValue(undefined);
      communityGuidelinesService.deleteCommunityGuidelines = vi
        .fn()
        .mockResolvedValue(undefined);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(spaceAboutRepository, 'remove').mockResolvedValue(about);

      // Act
      await service.removeSpaceAbout('about-1');

      // Assert
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCommunityGuidelines', () => {
    it('should return guidelines when they exist', async () => {
      // Arrange
      const mockGuidelines = { id: 'guide-1' };
      const about = {
        id: 'about-1',
        guidelines: mockGuidelines,
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(about);

      // Act
      const result = await service.getCommunityGuidelines(about);

      // Assert
      expect(result).toBe(mockGuidelines);
    });

    it('should throw EntityNotInitializedException when guidelines are not loaded', async () => {
      // Arrange
      const about = {
        id: 'about-1',
        guidelines: undefined,
      } as SpaceAbout;
      vi.spyOn(spaceAboutRepository, 'findOne').mockResolvedValue(about);

      // Act & Assert
      await expect(service.getCommunityGuidelines(about)).rejects.toThrow(
        'Unable to locate guidelines for community: about-1'
      );
    });
  });

  describe('getCommunityWithRoleSet', () => {
    it('should return community with roleSet when found', async () => {
      // Arrange
      const mockRoleSet = { id: 'roleset-1' };
      const mockCommunity = { id: 'community-1', roleSet: mockRoleSet };
      const mockSpace = { id: 'space-1', community: mockCommunity };
      spaceLookupService.getSpaceForSpaceAboutOrFail = vi
        .fn()
        .mockResolvedValue(mockSpace);

      // Act
      const result = await service.getCommunityWithRoleSet('about-1');

      // Assert
      expect(result).toBe(mockCommunity);
    });

    it('should throw RelationshipNotFoundException when community is missing', async () => {
      // Arrange
      const mockSpace = { id: 'space-1', community: undefined };
      spaceLookupService.getSpaceForSpaceAboutOrFail = vi
        .fn()
        .mockResolvedValue(mockSpace);

      // Act & Assert
      await expect(service.getCommunityWithRoleSet('about-1')).rejects.toThrow(
        'Unable to load community with RoleSet for space about-1'
      );
    });

    it('should throw RelationshipNotFoundException when roleSet is missing', async () => {
      // Arrange
      const mockSpace = {
        id: 'space-1',
        community: { id: 'community-1', roleSet: undefined },
      };
      spaceLookupService.getSpaceForSpaceAboutOrFail = vi
        .fn()
        .mockResolvedValue(mockSpace);

      // Act & Assert
      await expect(service.getCommunityWithRoleSet('about-1')).rejects.toThrow(
        'Unable to load community with RoleSet for space about-1'
      );
    });
  });

  describe('getMergedTemplateSpaceAbout', () => {
    it('should use input values when both input and template have them', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: 'template why',
        who: 'template who',
        guidelines: undefined,
        profile: {
          description: 'template description',
          tagline: 'template tagline',
          references: [],
          location: { city: 'Amsterdam', country: 'NL' },
          tagsets: [],
          visuals: [],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: 'input why',
        who: 'input who',
        profileData: {
          displayName: 'My Space',
          description: 'input description',
          tagline: 'input tagline',
          tagsets: [],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      expect(result.why).toBe('input why');
      expect(result.who).toBe('input who');
      expect(result.profileData.description).toBe('input description');
      expect(result.profileData.tagline).toBe('input tagline');
    });

    it('should fall back to template values when input values are empty', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: 'template why',
        who: 'template who',
        guidelines: undefined,
        profile: {
          description: 'template description',
          tagline: 'template tagline',
          references: [],
          location: { city: 'Berlin', country: 'DE' },
          tagsets: [],
          visuals: [],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'My Space',
          description: '',
          tagline: '',
          tagsets: [],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      expect(result.why).toBe('template why');
      expect(result.who).toBe('template who');
      expect(result.profileData.description).toBe('template description');
      expect(result.profileData.tagline).toBe('template tagline');
    });

    it('should merge tagsets from input and template, combining tags for same-name tagsets', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        guidelines: undefined,
        profile: {
          description: '',
          tagline: '',
          references: [],
          location: {},
          tagsets: [
            { name: 'skills', tags: ['typescript', 'graphql'] },
            { name: 'interests', tags: ['ai'] },
          ],
          visuals: [],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: [{ name: 'skills', tags: ['react', 'typescript'] }],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      const skillsTagset = result.profileData.tagsets?.find(
        t => t.name === 'skills'
      );
      expect(skillsTagset).toBeDefined();
      // Should merge unique tags
      expect(skillsTagset?.tags).toContain('react');
      expect(skillsTagset?.tags).toContain('typescript');
      expect(skillsTagset?.tags).toContain('graphql');

      const interestsTagset = result.profileData.tagsets?.find(
        t => t.name === 'interests'
      );
      expect(interestsTagset).toBeDefined();
      expect(interestsTagset?.tags).toContain('ai');
    });

    it('should return undefined tagsets when both input and template have no tagsets', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        profile: {
          description: '',
          tagline: '',
          references: [],
          location: {},
          tagsets: undefined,
          visuals: undefined,
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: undefined,
          visuals: undefined,
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      expect(result.profileData.tagsets).toBeUndefined();
      expect(result.profileData.visuals).toBeUndefined();
    });

    it('should merge visuals prioritizing input URIs over template URIs', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        profile: {
          description: '',
          tagline: '',
          references: [],
          location: {},
          tagsets: [],
          visuals: [
            { name: VisualType.AVATAR, uri: 'template-avatar.png' },
            { name: VisualType.BANNER, uri: 'template-banner.png' },
            { name: VisualType.CARD, uri: 'template-card.png' },
          ],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: [],
          visuals: [{ name: VisualType.AVATAR, uri: 'input-avatar.png' }],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      const avatar = result.profileData.visuals?.find(
        v => v.name === VisualType.AVATAR
      );
      expect(avatar?.uri).toBe('input-avatar.png');

      const banner = result.profileData.visuals?.find(
        v => v.name === VisualType.BANNER
      );
      expect(banner?.uri).toBe('template-banner.png');

      const card = result.profileData.visuals?.find(
        v => v.name === VisualType.CARD
      );
      expect(card?.uri).toBe('template-card.png');
    });

    it('should apply visual constraints from DEFAULT_VISUAL_CONSTRAINTS', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        profile: {
          description: '',
          tagline: '',
          references: [],
          location: {},
          tagsets: [],
          visuals: [{ name: VisualType.AVATAR, uri: 'avatar.png' }],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: [],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      const avatar = result.profileData.visuals?.find(
        v => v.name === VisualType.AVATAR
      );
      expect((avatar as any)?.minWidth).toBe(
        DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].minWidth
      );
      expect((avatar as any)?.maxWidth).toBe(
        DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].maxWidth
      );
    });

    it('should copy references from template', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        profile: {
          description: '',
          tagline: '',
          references: [
            { name: 'ref1', uri: 'http://example.com', description: 'desc1' },
          ],
          location: { city: 'Berlin', country: 'DE' },
          tagsets: [],
          visuals: [],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: [],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      expect(result.profileData.referencesData).toHaveLength(1);
      expect(result.profileData.referencesData![0]).toEqual({
        name: 'ref1',
        uri: 'http://example.com',
        description: 'desc1',
      });
    });

    it('should copy location from template', () => {
      // Arrange
      const templateAbout = {
        id: 'template-about',
        why: '',
        who: '',
        profile: {
          description: '',
          tagline: '',
          references: [],
          location: { city: 'Amsterdam', country: 'NL' },
          tagsets: [],
          visuals: [],
        },
      } as unknown as ISpaceAbout;

      const inputAbout = {
        why: '',
        who: '',
        profileData: {
          displayName: 'Space',
          description: '',
          tagline: '',
          tagsets: [],
          visuals: [],
        },
      } as any;

      // Act
      const result = service.getMergedTemplateSpaceAbout(
        templateAbout,
        inputAbout
      );

      // Assert
      expect(result.profileData.location).toEqual({
        city: 'Amsterdam',
        country: 'NL',
      });
    });
  });
});
