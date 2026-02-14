import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { EntityNotFoundException } from '@common/exceptions';
import { ProfileType } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { Post } from './post.entity';
import { PostService } from './post.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('PostService', () => {
  let service: PostService;
  let repository: Repository<Post>;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roomService: RoomService;

  beforeEach(async () => {
    vi.spyOn(Post, 'create').mockImplementation((input: any) => {
      const entity = new Post();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        repositoryProviderMockFactory(Post),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PostService);
    repository = module.get(getRepositoryToken(Post));
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    roomService = module.get(RoomService);
  });

  describe('createPost', () => {
    const storageAggregator = { id: 'storage-agg-1' } as any;
    const userID = 'user-1';
    const postInput = {
      nameID: 'test-post',
      profileData: {
        displayName: 'Test Post',
        visuals: [{ name: 'banner' }],
      },
      tags: ['tag1', 'tag2'],
    } as any;

    it('should create post with profile, visuals, tagset, authorization and comments room', async () => {
      const createdProfile = { id: 'profile-1', displayName: 'Test Post' } as any;
      const createdRoom = { id: 'room-1' } as any;

      vi.mocked(profileService.createProfile).mockResolvedValue(createdProfile);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(roomService.createRoom).mockResolvedValue(createdRoom);

      const result = await service.createPost(postInput, storageAggregator, userID);

      expect(profileService.createProfile).toHaveBeenCalledWith(
        postInput.profileData,
        ProfileType.POST,
        storageAggregator
      );
      expect(profileService.addVisualsOnProfile).toHaveBeenCalledWith(
        createdProfile,
        postInput.profileData.visuals,
        [VisualType.BANNER, VisualType.CARD]
      );
      expect(profileService.addOrUpdateTagsetOnProfile).toHaveBeenCalledWith(
        createdProfile,
        { name: TagsetReservedName.DEFAULT, tags: ['tag1', 'tag2'] }
      );
      expect(result.authorization).toBeDefined();
      expect(roomService.createRoom).toHaveBeenCalledWith({
        displayName: `post-comments-${postInput.nameID}`,
        type: RoomType.POST,
      });
      expect(result.comments).toBe(createdRoom);
    });

    it('should set createdBy to the provided userID', async () => {
      vi.mocked(profileService.createProfile).mockResolvedValue({} as any);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(roomService.createRoom).mockResolvedValue({} as any);

      const result = await service.createPost(postInput, storageAggregator, userID);

      expect(result.createdBy).toBe(userID);
    });

    it('should default tags to empty array when not provided', async () => {
      const inputNoTags = {
        nameID: 'no-tags-post',
        profileData: { displayName: 'No Tags' },
      } as any;

      vi.mocked(profileService.createProfile).mockResolvedValue({} as any);
      vi.mocked(profileService.addVisualsOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(undefined as any);
      vi.mocked(roomService.createRoom).mockResolvedValue({} as any);

      await service.createPost(inputNoTags, storageAggregator, userID);

      expect(profileService.addOrUpdateTagsetOnProfile).toHaveBeenCalledWith(
        expect.anything(),
        { name: TagsetReservedName.DEFAULT, tags: [] }
      );
    });
  });

  describe('deletePost', () => {
    it('should delete authorization, profile, comments and post', async () => {
      const post = {
        id: 'post-1',
        authorization: { id: 'auth-1' },
        profile: { id: 'profile-1' },
        comments: { id: 'room-1' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'remove').mockResolvedValue({ id: undefined } as any);

      const result = await service.deletePost('post-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(post.authorization);
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(roomService.deleteRoom).toHaveBeenCalledWith({ roomID: 'room-1' });
      expect(repository.remove).toHaveBeenCalledWith(post);
      expect(result.id).toBe('post-1');
    });

    it('should skip optional relations when absent', async () => {
      const post = {
        id: 'post-2',
        authorization: undefined,
        profile: undefined,
        comments: undefined,
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'remove').mockResolvedValue({ id: undefined } as any);

      await service.deletePost('post-2');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(profileService.deleteProfile).not.toHaveBeenCalled();
      expect(roomService.deleteRoom).not.toHaveBeenCalled();
      expect(repository.remove).toHaveBeenCalledWith(post);
    });
  });

  describe('getPostOrFail', () => {
    it('should return post when found', async () => {
      const post = { id: 'post-1', nameID: 'test' } as Post;
      vi.spyOn(repository, 'findOne').mockResolvedValue(post);

      const result = await service.getPostOrFail('post-1');

      expect(result).toBe(post);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
    });

    it('should throw EntityNotFoundException when not found', async () => {
      vi.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getPostOrFail('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass through options to findOne', async () => {
      const post = { id: 'post-1' } as Post;
      const options = { relations: { profile: true } } as any;
      vi.spyOn(repository, 'findOne').mockResolvedValue(post);

      await service.getPostOrFail('post-1', options);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        relations: { profile: true },
      });
    });
  });

  describe('updatePost', () => {
    it('should update profile when profileData is provided', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: { id: 'profile-1', displayName: 'Old Name' },
        comments: { id: 'room-1' },
      } as any;
      const updatedProfile = { id: 'profile-1', displayName: 'New Name' } as any;
      const postData = {
        ID: 'post-1',
        profileData: { displayName: 'New Name' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'save').mockResolvedValue(post);
      vi.mocked(profileService.updateProfile).mockResolvedValue(updatedProfile);

      const result = await service.updatePost(postData);

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        postData.profileData
      );
      expect(result).toBeDefined();
    });

    it('should sync room name when displayName changes', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: { id: 'profile-1', displayName: 'Old Name' },
        comments: { id: 'room-1' },
      } as any;
      const postData = {
        ID: 'post-1',
        profileData: { displayName: 'New Name' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'save').mockResolvedValue(post);
      vi.mocked(profileService.updateProfile).mockResolvedValue(post.profile);

      await service.updatePost(postData);

      expect(roomService.updateRoomDisplayName).toHaveBeenCalledWith(
        post.comments,
        'post-comments-test-post'
      );
    });

    it('should not sync room name when displayName is unchanged', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: { id: 'profile-1', displayName: 'Same Name' },
        comments: { id: 'room-1' },
      } as any;
      const postData = {
        ID: 'post-1',
        profileData: { displayName: 'Same Name' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'save').mockResolvedValue(post);
      vi.mocked(profileService.updateProfile).mockResolvedValue(post.profile);

      await service.updatePost(postData);

      expect(roomService.updateRoomDisplayName).not.toHaveBeenCalled();
    });

    it('should not sync room name when comments is not loaded', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: { id: 'profile-1', displayName: 'Old Name' },
        comments: undefined,
      } as any;
      const postData = {
        ID: 'post-1',
        profileData: { displayName: 'New Name' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'save').mockResolvedValue(post);
      vi.mocked(profileService.updateProfile).mockResolvedValue(post.profile);

      await service.updatePost(postData);

      expect(roomService.updateRoomDisplayName).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: undefined,
        comments: undefined,
      } as any;
      const postData = {
        ID: 'post-1',
        profileData: { displayName: 'New Name' },
      } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);

      await expect(service.updatePost(postData)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should skip profile update when profileData is not provided', async () => {
      const post = {
        id: 'post-1',
        nameID: 'test-post',
        profile: { id: 'profile-1' },
      } as any;
      const postData = { ID: 'post-1' } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);
      vi.spyOn(repository, 'save').mockResolvedValue(post);

      await service.updatePost(postData);

      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', async () => {
      const profile = { id: 'profile-1', displayName: 'Test' } as any;
      const post = { id: 'post-1', profile } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);

      const result = await service.getProfile(post);

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const post = { id: 'post-1', profile: undefined } as any;

      vi.spyOn(repository, 'findOne').mockResolvedValue(post);

      await expect(service.getProfile(post)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getComments', () => {
    const createQueryBuilderMock = (rawResult: any) => {
      return {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue(rawResult),
      };
    };

    it('should get comments via room service when commentsId exists', async () => {
      const commentsRoom = { id: 'room-1', displayName: 'comments' } as any;
      const qb = createQueryBuilderMock({ commentsId: 'room-1' });

      vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as any);
      vi.mocked(roomService.getRoomOrFail).mockResolvedValue(commentsRoom);

      const result = await service.getComments('post-1');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('post');
      expect(qb.select).toHaveBeenCalledWith('post.commentsId', 'commentsId');
      expect(qb.where).toHaveBeenCalledWith({ id: 'post-1' });
      expect(roomService.getRoomOrFail).toHaveBeenCalledWith('room-1');
      expect(result).toBe(commentsRoom);
    });

    it('should throw EntityNotFoundException when commentsId is null', async () => {
      const qb = createQueryBuilderMock({ commentsId: null });

      vi.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as any);

      await expect(service.getComments('post-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('savePost', () => {
    it('should persist the post to the repository', async () => {
      const post = { id: 'post-1', nameID: 'test' } as any;
      vi.spyOn(repository, 'save').mockResolvedValue(post);

      const result = await service.savePost(post);

      expect(repository.save).toHaveBeenCalledWith(post);
      expect(result).toBe(post);
    });
  });
});
