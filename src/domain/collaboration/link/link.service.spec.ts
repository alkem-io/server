import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { Link } from './link.entity';
import { LinkService } from './link.service';

describe('LinkService', () => {
  let service: LinkService;
  let linkRepository: MockType<Repository<Link>>;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.spyOn(Link, 'create').mockImplementation((input: any) => {
      const entity = new Link();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        repositoryProviderMockFactory(Link),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LinkService);
    linkRepository = module.get(getRepositoryToken(Link));
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('createLink', () => {
    it('should create a link with profile and authorization policy', async () => {
      const mockProfile = { id: 'profile-1', displayName: 'Test' };
      vi.mocked(profileService.createProfile).mockResolvedValue(
        mockProfile as any
      );

      const storageAggregator = { id: 'storage-1' } as any;
      const linkData = {
        profile: { displayName: 'Test Link' },
        uri: 'https://example.com',
      } as any;

      const result = await service.createLink(linkData, storageAggregator);

      expect(result.uri).toBe('https://example.com');
      expect(result.authorization).toBeDefined();
      expect(result.profile).toBe(mockProfile);
      expect(vi.mocked(profileService.createProfile)).toHaveBeenCalledWith(
        linkData.profile,
        expect.any(String),
        storageAggregator
      );
    });
  });

  describe('updateLink', () => {
    it('should update profile when profile data is provided', async () => {
      const existingLink = {
        id: 'link-1',
        uri: 'https://old.com',
        profile: { id: 'profile-1' },
      } as unknown as Link;
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };

      linkRepository.findOne!.mockResolvedValue(existingLink);
      vi.mocked(profileService.updateProfile).mockResolvedValue(
        updatedProfile as any
      );
      linkRepository.save!.mockImplementation((link: any) =>
        Promise.resolve(link)
      );

      const result = await service.updateLink({
        ID: 'link-1',
        profile: { ID: 'profile-1', displayName: 'Updated' } as any,
      });

      expect(vi.mocked(profileService.updateProfile)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        expect.objectContaining({ ID: 'profile-1' })
      );
      expect(result.profile).toBe(updatedProfile);
    });

    it('should update URI when URI is provided', async () => {
      const existingLink = {
        id: 'link-1',
        uri: 'https://old.com',
        profile: { id: 'profile-1' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(existingLink);
      linkRepository.save!.mockImplementation((link: any) =>
        Promise.resolve(link)
      );

      const result = await service.updateLink({
        ID: 'link-1',
        uri: 'https://new.com',
      });

      expect(result.uri).toBe('https://new.com');
    });

    it('should not update profile when profile data is not provided', async () => {
      const existingLink = {
        id: 'link-1',
        uri: 'https://old.com',
        profile: { id: 'profile-1' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(existingLink);
      linkRepository.save!.mockImplementation((link: any) =>
        Promise.resolve(link)
      );

      await service.updateLink({ ID: 'link-1' });

      expect(vi.mocked(profileService.updateProfile)).not.toHaveBeenCalled();
    });
  });

  describe('deleteLink', () => {
    it('should delete profile, authorization, and link in order', async () => {
      const link = {
        id: 'link-1',
        uri: 'https://example.com',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);
      vi.mocked(profileService.deleteProfile).mockResolvedValue({} as any);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);
      linkRepository.remove!.mockResolvedValue({ ...link, id: undefined });

      const result = await service.deleteLink('link-1');

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'profile-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        link.authorization
      );
      expect(linkRepository.remove).toHaveBeenCalledWith(link);
      expect(result.id).toBe('link-1');
    });

    it('should restore ID on the result after repository remove', async () => {
      const link = {
        id: 'link-1',
        uri: 'https://example.com',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);
      vi.mocked(profileService.deleteProfile).mockResolvedValue({} as any);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);
      // Simulate TypeORM remove clearing the id
      linkRepository.remove!.mockResolvedValue({ uri: 'https://example.com' });

      const result = await service.deleteLink('link-1');

      expect(result.id).toBe('link-1');
    });

    it('should skip profile deletion when profile is not set', async () => {
      const link = {
        id: 'link-2',
        uri: 'https://example.com',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);
      linkRepository.remove!.mockResolvedValue({ uri: 'https://example.com' });

      await service.deleteLink('link-2');

      expect(vi.mocked(profileService.deleteProfile)).not.toHaveBeenCalled();
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      const link = {
        id: 'link-3',
        uri: 'https://example.com',
        profile: { id: 'profile-1' },
        authorization: undefined,
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);
      vi.mocked(profileService.deleteProfile).mockResolvedValue({} as any);
      linkRepository.remove!.mockResolvedValue({ uri: 'https://example.com' });

      await service.deleteLink('link-3');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('getLinkOrFail', () => {
    it('should return link when found', async () => {
      const link = { id: 'link-1', uri: 'https://example.com' } as Link;
      linkRepository.findOne!.mockResolvedValue(link);

      const result = await service.getLinkOrFail('link-1');

      expect(result).toBe(link);
      expect(linkRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'link-1' } })
      );
    });

    it('should throw EntityNotFoundException when link is not found', async () => {
      linkRepository.findOne!.mockResolvedValue(null);

      await expect(service.getLinkOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', async () => {
      const link = {
        id: 'link-1',
        profile: { id: 'profile-1', displayName: 'Test' },
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);

      const result = await service.getProfile({ id: 'link-1' } as Link);

      expect(result).toEqual(expect.objectContaining({ id: 'profile-1' }));
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const link = {
        id: 'link-1',
        profile: undefined,
      } as unknown as Link;

      linkRepository.findOne!.mockResolvedValue(link);

      await expect(
        service.getProfile({ id: 'link-1' } as Link)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('save', () => {
    it('should persist link to repository', async () => {
      const link = { id: 'link-1', uri: 'https://example.com' } as Link;
      linkRepository.save!.mockResolvedValue(link);

      const result = await service.save(link);

      expect(result).toBe(link);
      expect(linkRepository.save).toHaveBeenCalledWith(link);
    });
  });
});
