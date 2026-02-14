import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { vi, type Mock } from 'vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunityGuidelines } from './community.guidelines.entity';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';

describe('CommunityGuidelinesService', () => {
  let service: CommunityGuidelinesService;
  let repository: {
    findOne: Mock;
    save: Mock;
    remove: Mock;
  };
  let profileService: {
    createProfile: Mock;
    addVisualsOnProfile: Mock;
    updateProfile: Mock;
    deleteProfile: Mock;
    deleteAllReferencesFromProfile: Mock;
    save: Mock;
  };
  let tagsetService: {
    updateTagsetInputs: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityGuidelinesService,
        repositoryProviderMockFactory(CommunityGuidelines),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityGuidelinesService);
    repository = module.get(getRepositoryToken(CommunityGuidelines));
    profileService = module.get(ProfileService) as any;
    tagsetService = module.get(TagsetService) as any;
  });

  describe('getCommunityGuidelinesOrFail', () => {
    it('should return community guidelines when found', async () => {
      const mockGuidelines = { id: 'cg-1', profile: { id: 'p-1' } };
      repository.findOne.mockResolvedValue(mockGuidelines);

      const result = await service.getCommunityGuidelinesOrFail('cg-1');

      expect(result).toBe(mockGuidelines);
    });

    it('should throw EntityNotFoundException when community guidelines are not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.getCommunityGuidelinesOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createCommunityGuidelines', () => {
    it('should create guidelines with authorization, profile, and visuals', async () => {
      const mockProfile = { id: 'profile-1' };
      tagsetService.updateTagsetInputs.mockReturnValue([]);
      profileService.createProfile.mockResolvedValue(mockProfile);
      profileService.addVisualsOnProfile.mockResolvedValue(undefined);

      const storageAggregator = { id: 'storage-1' } as any;
      const result = await service.createCommunityGuidelines(
        {
          profile: {
            displayName: 'Guidelines',
            tagsets: [],
          },
        } as any,
        storageAggregator
      );

      expect(result.authorization).toBeDefined();
      expect(result.profile).toBe(mockProfile);
      expect(profileService.createProfile).toHaveBeenCalled();
      expect(profileService.addVisualsOnProfile).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update the profile and save the community guidelines', async () => {
      const mockProfile = { id: 'profile-1', displayName: 'Updated' };
      profileService.updateProfile.mockResolvedValue(mockProfile);

      const guidelines = { id: 'cg-1', profile: { id: 'profile-1' } } as any;
      const updateData = { profile: { displayName: 'Updated' } } as any;
      repository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(guidelines, updateData);

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        updateData.profile
      );
      expect(result.profile).toBe(mockProfile);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('eraseContent', () => {
    it('should clear display name and description and delete all references', async () => {
      const mockProfile = { id: 'profile-1', displayName: '', description: '', references: [{ id: 'ref-1' }] };
      profileService.updateProfile.mockResolvedValue(mockProfile);
      profileService.deleteAllReferencesFromProfile.mockResolvedValue(undefined);
      repository.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const guidelines = {
        id: 'cg-1',
        profile: { id: 'profile-1', displayName: 'Old', description: 'Old desc', references: [{ id: 'ref-1' }] },
      } as any;

      const result = await service.eraseContent(guidelines);

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        { displayName: '', description: '' }
      );
      expect(profileService.deleteAllReferencesFromProfile).toHaveBeenCalledWith('profile-1');
      expect(result.profile.references).toEqual([]);
    });
  });

  describe('deleteCommunityGuidelines', () => {
    it('should delete the profile and remove the community guidelines', async () => {
      const mockGuidelines = { id: 'cg-1', profile: { id: 'profile-1' } };
      repository.findOne.mockResolvedValue(mockGuidelines);
      profileService.deleteProfile.mockResolvedValue(undefined);
      repository.remove.mockResolvedValue({ ...mockGuidelines, id: undefined });

      const result = await service.deleteCommunityGuidelines('cg-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(repository.remove).toHaveBeenCalled();
      expect(result.id).toBe('cg-1');
    });

    it('should throw EntityNotFoundException when community guidelines are not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteCommunityGuidelines('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return the profile when community guidelines have a profile loaded', async () => {
      const mockProfile = { id: 'profile-1', displayName: 'Test' };
      const mockGuidelines = { id: 'cg-1', profile: mockProfile };
      repository.findOne.mockResolvedValue(mockGuidelines);

      const result = await service.getProfile({ id: 'cg-1' } as any);

      expect(result).toBe(mockProfile);
    });

    it('should throw EntityNotFoundException when profile is not loaded', async () => {
      const mockGuidelines = { id: 'cg-1', profile: undefined };
      repository.findOne.mockResolvedValue(mockGuidelines);

      await expect(service.getProfile({ id: 'cg-1' } as any)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
