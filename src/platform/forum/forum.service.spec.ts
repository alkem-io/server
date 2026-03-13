import { DiscussionsOrderBy } from '@common/enums/discussions.orderBy';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { DiscussionService } from '../forum-discussion/discussion.service';
import { Forum } from './forum.entity';
import { ForumService } from './forum.service';

describe('ForumService', () => {
  let service: ForumService;
  let repo: MockType<Repository<Forum>>;
  let discussionService: DiscussionService;
  let communicationAdapter: CommunicationAdapter;
  let namingService: NamingService;
  let storageAggregatorResolverService: StorageAggregatorResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        repositoryProviderMockFactory(Forum),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ForumService);
    repo = module.get(getRepositoryToken(Forum));
    discussionService = module.get(DiscussionService);
    communicationAdapter = module.get(CommunicationAdapter);
    namingService = module.get(NamingService);
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForum', () => {
    it('should create a forum with authorization and discussion categories', async () => {
      repo.save!.mockImplementation(async (f: any) => f);

      const result = await service.createForum(['RELEASES', 'GENERAL'] as any);

      expect(result).toBeDefined();
      expect(result.discussions).toEqual([]);
      expect(result.discussionCategories).toEqual(['RELEASES', 'GENERAL']);
      expect(result.authorization).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save and return forum', async () => {
      const forum = { id: 'f1' } as any;
      repo.save!.mockResolvedValue(forum);

      const result = await service.save(forum);

      expect(result).toBe(forum);
    });
  });

  describe('getForumOrFail', () => {
    it('should return forum when found', async () => {
      const forum = { id: 'f1' } as any;
      repo.findOne!.mockResolvedValue(forum);

      const result = await service.getForumOrFail('f1');

      expect(result).toBe(forum);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.getForumOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getDiscussions', () => {
    it('should return discussions sorted by createdDate DESC by default', async () => {
      const now = new Date();
      const older = new Date(now.getTime() - 10000);
      const discussions = [
        { id: 'd1', createdDate: older },
        { id: 'd2', createdDate: now },
      ];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);

      const result = await service.getDiscussions({ id: 'f1' } as any);

      expect(result[0].id).toBe('d2');
      expect(result[1].id).toBe('d1');
    });

    it('should return discussions sorted ASC when specified', async () => {
      const now = new Date();
      const older = new Date(now.getTime() - 10000);
      const discussions = [
        { id: 'd1', createdDate: older },
        { id: 'd2', createdDate: now },
      ];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);

      const result = await service.getDiscussions(
        { id: 'f1' } as any,
        undefined,
        DiscussionsOrderBy.DISCUSSIONS_CREATEDATE_ASC
      );

      expect(result[0].id).toBe('d1');
      expect(result[1].id).toBe('d2');
    });

    it('should limit results when limit is specified', async () => {
      const discussions = [
        { id: 'd1', createdDate: new Date(3000) },
        { id: 'd2', createdDate: new Date(2000) },
        { id: 'd3', createdDate: new Date(1000) },
      ];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);

      const result = await service.getDiscussions({ id: 'f1' } as any, 2);

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotInitializedException when discussions are undefined', async () => {
      const forum = { id: 'f1', discussions: undefined } as any;
      repo.findOne!.mockResolvedValue(forum);

      await expect(service.getDiscussions({ id: 'f1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getDiscussionOrFail', () => {
    it('should return discussion when it belongs to the forum', async () => {
      const discussion = { id: 'd1', forum: { id: 'f1' } } as any;
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );

      const result = await service.getDiscussionOrFail(
        { id: 'f1' } as any,
        'd1'
      );

      expect(result).toBe(discussion);
    });

    it('should throw when discussion does not belong to the forum', async () => {
      const discussion = { id: 'd1', forum: { id: 'other-forum' } } as any;
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );

      await expect(
        service.getDiscussionOrFail({ id: 'f1' } as any, 'd1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when discussion has no forum', async () => {
      const discussion = { id: 'd1', forum: undefined } as any;
      (discussionService.getDiscussionOrFail as Mock).mockResolvedValue(
        discussion
      );

      await expect(
        service.getDiscussionOrFail({ id: 'f1' } as any, 'd1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createDiscussion', () => {
    it('should create a discussion successfully', async () => {
      const forum = {
        id: 'f1',
        discussionCategories: ['GENERAL'],
      } as any;
      repo.findOne!.mockResolvedValue(forum);

      const discussionData = {
        forumID: 'f1',
        category: 'GENERAL',
        profile: { displayName: 'Test Discussion' },
      } as any;

      (
        storageAggregatorResolverService.getStorageAggregatorForForum as Mock
      ).mockResolvedValue({ id: 'sa-1' });
      (namingService.getReservedNameIDsInForum as Mock).mockResolvedValue([]);
      (
        namingService.createNameIdAvoidingReservedNameIDs as Mock
      ).mockReturnValue('test-discussion');

      const createdDiscussion = { id: 'd1', forum: undefined } as any;
      (discussionService.createDiscussion as Mock).mockResolvedValue(
        createdDiscussion
      );
      (discussionService.save as Mock).mockResolvedValue(createdDiscussion);
      (discussionService.getComments as Mock).mockResolvedValue({
        id: 'room-1',
      });
      (communicationAdapter.batchAddMember as Mock).mockResolvedValue(
        undefined
      );

      const result = await service.createDiscussion(
        discussionData,
        'user-1',
        'forum-user-1'
      );

      expect(result).toBe(createdDiscussion);
      expect(discussionService.createDiscussion).toHaveBeenCalled();
    });

    it('should throw ForumDiscussionCategoryException for invalid category', async () => {
      const forum = {
        id: 'f1',
        discussionCategories: ['RELEASES'],
      } as any;
      repo.findOne!.mockResolvedValue(forum);

      const discussionData = {
        forumID: 'f1',
        category: 'INVALID_CATEGORY',
        profile: { displayName: 'Bad Category' },
      } as any;

      await expect(
        service.createDiscussion(discussionData, 'user-1', 'forum-user-1')
      ).rejects.toThrow(ForumDiscussionCategoryException);
    });
  });

  describe('removeForum', () => {
    it('should remove all discussions and then the forum', async () => {
      const discussions = [
        { id: 'd1', createdDate: new Date() },
        { id: 'd2', createdDate: new Date() },
      ];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);
      (discussionService.removeDiscussion as Mock).mockResolvedValue(true);
      repo.remove!.mockResolvedValue(undefined);

      const result = await service.removeForum('f1');

      expect(result).toBe(true);
      expect(discussionService.removeDiscussion).toHaveBeenCalledTimes(2);
      expect(repo.remove).toHaveBeenCalled();
    });
  });

  describe('addUserToForums', () => {
    it('should add user to all forum rooms', async () => {
      const discussions = [{ id: 'd1', createdDate: new Date() }];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);
      (discussionService.getComments as Mock).mockResolvedValue({
        id: 'room-1',
      });
      (communicationAdapter.batchAddMember as Mock).mockResolvedValue(
        undefined
      );

      const result = await service.addUserToForums(
        { id: 'f1' } as any,
        'forum-user-1'
      );

      expect(result).toBe(true);
      expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith(
        'forum-user-1',
        ['room-1']
      );
    });
  });

  describe('getRoomsUsed', () => {
    it('should return room IDs from all discussions', async () => {
      const discussions = [
        { id: 'd1', createdDate: new Date() },
        { id: 'd2', createdDate: new Date() },
      ];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);
      (discussionService.getComments as Mock)
        .mockResolvedValueOnce({ id: 'room-1' })
        .mockResolvedValueOnce({ id: 'room-2' });

      const result = await service.getRoomsUsed({ id: 'f1' } as any);

      expect(result).toEqual(['room-1', 'room-2']);
    });
  });

  describe('getForumIDsUsed', () => {
    it('should return all forum IDs', async () => {
      const qb = {
        getMany: vi.fn().mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]),
      };
      repo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.getForumIDsUsed();

      expect(result).toEqual(['f1', 'f2']);
    });
  });

  describe('removeUserFromForums', () => {
    it('should remove user from all forum rooms', async () => {
      const discussions = [{ id: 'd1', createdDate: new Date() }];
      const forum = { id: 'f1', discussions } as any;
      repo.findOne!.mockResolvedValue(forum);
      (discussionService.getComments as Mock).mockResolvedValue({
        id: 'room-1',
      });
      (communicationAdapter.batchRemoveMember as Mock).mockResolvedValue(
        undefined
      );

      const result = await service.removeUserFromForums(
        { id: 'f1' } as any,
        { id: 'user-1' } as any
      );

      expect(result).toBe(true);
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
        'user-1',
        ['room-1']
      );
    });
  });
});
