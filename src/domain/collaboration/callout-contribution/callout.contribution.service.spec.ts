import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { PostService } from '../post/post.service';
import { LinkService } from '../link/link.service';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionService } from './callout.contribution.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Mock, vi } from 'vitest';

describe('CalloutContributionService', () => {
  let service: CalloutContributionService;
  let repository: Repository<CalloutContribution>;
  let postService: PostService;
  let whiteboardService: WhiteboardService;
  let linkService: LinkService;
  let memoService: MemoService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    // Mock static CalloutContribution.create to avoid DataSource requirement
    vi.spyOn(CalloutContribution, 'create').mockImplementation(
      (input: any) => {
        const entity = new CalloutContribution();
        Object.assign(entity, input);
        return entity as any;
      }
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionService,
        repositoryProviderMockFactory(CalloutContribution),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutContributionService);
    repository = module.get(getRepositoryToken(CalloutContribution));
    postService = module.get(PostService);
    whiteboardService = module.get(WhiteboardService);
    linkService = module.get(LinkService);
    memoService = module.get(MemoService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('createCalloutContribution', () => {
    const storageAggregator = { id: 'storage-agg-1' } as any;
    const userID = 'user-1';

    it('should create a POST contribution when type is allowed and post data is provided', async () => {
      const contributionData = {
        type: CalloutContributionType.POST,
        post: { profileData: { displayName: 'Test Post' } },
        sortOrder: 5,
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.POST],
      };
      const createdPost = { id: 'post-1' } as any;

      vi.mocked(postService.createPost).mockResolvedValue(createdPost);

      const result = await service.createCalloutContribution(
        contributionData,
        storageAggregator,
        contributionSettings,
        userID
      );

      expect(result.type).toBe(CalloutContributionType.POST);
      expect(result.createdBy).toBe(userID);
      expect(result.sortOrder).toBe(5);
      expect(result.post).toBe(createdPost);
      expect(postService.createPost).toHaveBeenCalledWith(
        contributionData.post,
        storageAggregator,
        userID
      );
    });

    it('should create a WHITEBOARD contribution when type is allowed', async () => {
      const contributionData = {
        type: CalloutContributionType.WHITEBOARD,
        whiteboard: { profile: { displayName: 'Test WB' } },
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.WHITEBOARD],
      };
      const createdWb = { id: 'wb-1' } as any;

      vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue(
        createdWb
      );

      const result = await service.createCalloutContribution(
        contributionData,
        storageAggregator,
        contributionSettings,
        userID
      );

      expect(result.whiteboard).toBe(createdWb);
    });

    it('should create a LINK contribution when type is allowed', async () => {
      const contributionData = {
        type: CalloutContributionType.LINK,
        link: { profile: { displayName: 'Link' }, uri: 'https://test.com' },
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.LINK],
      };
      const createdLink = { id: 'link-1' } as any;

      vi.mocked(linkService.createLink).mockResolvedValue(createdLink);

      const result = await service.createCalloutContribution(
        contributionData,
        storageAggregator,
        contributionSettings,
        userID
      );

      expect(result.link).toBe(createdLink);
    });

    it('should create a MEMO contribution when type is allowed', async () => {
      const contributionData = {
        type: CalloutContributionType.MEMO,
        memo: { profile: { displayName: 'Memo' } },
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.MEMO],
      };
      const createdMemo = { id: 'memo-1' } as any;

      vi.mocked(memoService.createMemo).mockResolvedValue(createdMemo);

      const result = await service.createCalloutContribution(
        contributionData,
        storageAggregator,
        contributionSettings,
        userID
      );

      expect(result.memo).toBe(createdMemo);
    });

    it('should default sortOrder to 0 when not provided', async () => {
      const contributionData = {
        type: CalloutContributionType.POST,
        post: { profileData: { displayName: 'Test' } },
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.POST],
      };

      vi.mocked(postService.createPost).mockResolvedValue({} as any);

      const result = await service.createCalloutContribution(
        contributionData,
        storageAggregator,
        contributionSettings,
        userID
      );

      expect(result.sortOrder).toBe(0);
    });

    it('should throw ValidationException when contribution type is not in allowedTypes', async () => {
      const contributionData = {
        type: CalloutContributionType.POST,
        post: { profileData: { displayName: 'Test' } },
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.WHITEBOARD],
      };

      await expect(
        service.createCalloutContribution(
          contributionData,
          storageAggregator,
          contributionSettings,
          userID
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when declared type has no corresponding data', async () => {
      const contributionData = {
        type: CalloutContributionType.POST,
        // no post data provided
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.POST],
      };

      await expect(
        service.createCalloutContribution(
          contributionData,
          storageAggregator,
          contributionSettings,
          userID
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when conflicting data fields are present', async () => {
      const contributionData = {
        type: CalloutContributionType.POST,
        post: { profileData: { displayName: 'Test' } },
        whiteboard: { profile: { displayName: 'WB' } }, // conflicting
      } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.POST],
      };

      await expect(
        service.createCalloutContribution(
          contributionData,
          storageAggregator,
          contributionSettings,
          userID
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('createCalloutContributions', () => {
    it('should create multiple contributions and return them in order', async () => {
      const storageAggregator = { id: 'agg-1' } as any;
      const contributionSettings = {
        allowedTypes: [CalloutContributionType.POST],
      };
      const contributionsData = [
        {
          type: CalloutContributionType.POST,
          post: { profileData: { displayName: 'Post 1' } },
        },
        {
          type: CalloutContributionType.POST,
          post: { profileData: { displayName: 'Post 2' } },
        },
      ] as any[];

      vi.mocked(postService.createPost)
        .mockResolvedValueOnce({ id: 'post-1' } as any)
        .mockResolvedValueOnce({ id: 'post-2' } as any);

      const results = await service.createCalloutContributions(
        contributionsData,
        storageAggregator,
        contributionSettings,
        'user-1'
      );

      expect(results).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('should delete post, authorization, and remove contribution', async () => {
      const contribution = {
        id: 'contrib-1',
        post: { id: 'post-1' },
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(contribution);
      vi.mocked(repository.remove).mockResolvedValue({
        id: undefined,
      } as any);

      const result = await service.delete('contrib-1');

      expect(postService.deletePost).toHaveBeenCalledWith('post-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        contribution.authorization
      );
      expect(repository.remove).toHaveBeenCalled();
      expect(result.id).toBe('contrib-1');
    });

    it('should delete whiteboard when contribution has whiteboard', async () => {
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        whiteboard: { id: 'wb-1' },
        link: undefined,
        memo: undefined,
        authorization: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(contribution);
      vi.mocked(repository.remove).mockResolvedValue({
        id: undefined,
      } as any);

      await service.delete('contrib-1');

      expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
    });

    it('should delete link when contribution has link', async () => {
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        whiteboard: undefined,
        link: { id: 'link-1' },
        memo: undefined,
        authorization: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(contribution);
      vi.mocked(repository.remove).mockResolvedValue({
        id: undefined,
      } as any);

      await service.delete('contrib-1');

      expect(linkService.deleteLink).toHaveBeenCalledWith('link-1');
    });

    it('should delete memo when contribution has memo', async () => {
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: { id: 'memo-1' },
        authorization: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(contribution);
      vi.mocked(repository.remove).mockResolvedValue({
        id: undefined,
      } as any);

      await service.delete('contrib-1');

      expect(memoService.deleteMemo).toHaveBeenCalledWith('memo-1');
    });

    it('should throw EntityNotFoundException when contribution does not exist', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('save', () => {
    it('should save a single contribution and return it', async () => {
      const contribution = { id: 'contrib-1' } as any;
      vi.mocked(repository.save).mockResolvedValue([contribution]);

      const result = await service.save(contribution);

      expect(result).toBe(contribution);
    });

    it('should save an array of contributions and return the array', async () => {
      const contributions = [{ id: 'c-1' }, { id: 'c-2' }] as any[];
      vi.mocked(repository.save).mockResolvedValue(contributions);

      const result = await service.save(contributions);

      expect(result).toBe(contributions);
    });
  });

  describe('getCalloutContributionOrFail', () => {
    it('should return contribution when found', async () => {
      const contribution = { id: 'contrib-1' } as CalloutContribution;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result = await service.getCalloutContributionOrFail('contrib-1');

      expect(result).toBe(contribution);
    });

    it('should throw EntityNotFoundException when contribution is not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getCalloutContributionOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getWhiteboard', () => {
    it('should return whiteboard when contribution has one', async () => {
      const whiteboard = { id: 'wb-1' } as any;
      const contribution = {
        id: 'contrib-1',
        whiteboard,
      } as CalloutContribution;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result = await service.getWhiteboard({ id: 'contrib-1' } as any);

      expect(result).toBe(whiteboard);
    });

    it('should return null when contribution has no whiteboard', async () => {
      const contribution = {
        id: 'contrib-1',
        whiteboard: undefined,
      } as CalloutContribution;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result = await service.getWhiteboard({ id: 'contrib-1' } as any);

      expect(result).toBeNull();
    });
  });

  describe('getStorageBucketForContribution', () => {
    it('should return storage bucket from post profile', async () => {
      const storageBucket = { id: 'bucket-1' };
      const contribution = {
        id: 'contrib-1',
        post: { profile: { storageBucket } },
        link: undefined,
        whiteboard: undefined,
        memo: undefined,
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result =
        await service.getStorageBucketForContribution('contrib-1');

      expect(result).toBe(storageBucket);
    });

    it('should throw RelationshipNotFoundException when no profile with storage bucket exists', async () => {
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        link: undefined,
        whiteboard: undefined,
        memo: undefined,
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      await expect(
        service.getStorageBucketForContribution('contrib-1')
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return storage bucket from link profile when post is absent', async () => {
      const storageBucket = { id: 'bucket-2' };
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        link: { profile: { storageBucket } },
        whiteboard: undefined,
        memo: undefined,
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result =
        await service.getStorageBucketForContribution('contrib-1');

      expect(result).toBe(storageBucket);
    });

    it('should return storage bucket from whiteboard profile', async () => {
      const storageBucket = { id: 'bucket-3' };
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        link: undefined,
        whiteboard: { profile: { storageBucket } },
        memo: undefined,
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result =
        await service.getStorageBucketForContribution('contrib-1');

      expect(result).toBe(storageBucket);
    });

    it('should return storage bucket from memo profile', async () => {
      const storageBucket = { id: 'bucket-4' };
      const contribution = {
        id: 'contrib-1',
        post: undefined,
        link: undefined,
        whiteboard: undefined,
        memo: { profile: { storageBucket } },
      } as any;
      vi.mocked(repository.findOne).mockResolvedValue(contribution);

      const result =
        await service.getStorageBucketForContribution('contrib-1');

      expect(result).toBe(storageBucket);
    });
  });

  describe('getContributionsCountBatch', () => {
    function createBatchQueryBuilderMock(
      rawResult: { calloutId: string; count: string }[] = []
    ) {
      return {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(rawResult),
      };
    }

    it('should return an empty map for empty calloutIds', async () => {
      const result = await service.getContributionsCountBatch([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should batch count contributions in a single grouped query', async () => {
      const qb = createBatchQueryBuilderMock([
        { calloutId: 'callout-1', count: '5' },
        { calloutId: 'callout-2', count: '12' },
      ]);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      const result = await service.getContributionsCountBatch([
        'callout-1',
        'callout-2',
      ]);

      expect(repository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith(
        'contribution'
      );
      expect(result.get('callout-1')).toBe(5);
      expect(result.get('callout-2')).toBe(12);
    });

    it('should pass callout IDs in the IN clause', async () => {
      const qb = createBatchQueryBuilderMock([]);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      await service.getContributionsCountBatch([
        'callout-a',
        'callout-b',
        'callout-c',
      ]);

      expect(qb.where).toHaveBeenCalledWith(
        'contribution.calloutId IN (:...calloutIds)',
        { calloutIds: ['callout-a', 'callout-b', 'callout-c'] }
      );
    });

    it('should return 0 for callouts with no contributions (not in map)', async () => {
      const qb = createBatchQueryBuilderMock([
        { calloutId: 'callout-1', count: '3' },
      ]);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      const result = await service.getContributionsCountBatch([
        'callout-1',
        'callout-2',
      ]);

      expect(result.get('callout-1')).toBe(3);
      expect(result.has('callout-2')).toBe(false); // caller uses ?? 0
    });

    it('should parse count strings as integers', async () => {
      const qb = createBatchQueryBuilderMock([
        { calloutId: 'callout-1', count: '4567' },
      ]);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(['callout-1']);
      const count = result.get('callout-1');

      expect(count).toBe(4567);
      expect(typeof count).toBe('number');
    });

    it('should handle a single callout ID', async () => {
      const qb = createBatchQueryBuilderMock([
        { calloutId: 'only-one', count: '1' },
      ]);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(['only-one']);

      expect(result.get('only-one')).toBe(1);
    });

    it('should propagate database errors', async () => {
      const qb = createBatchQueryBuilderMock();
      qb.getRawMany.mockRejectedValue(new Error('DB error'));
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      await expect(
        service.getContributionsCountBatch(['callout-1'])
      ).rejects.toThrow('DB error');
    });

    it('should handle large batch of callout IDs', async () => {
      const calloutIds = Array.from(
        { length: 100 },
        (_, i) => `callout-${i}`
      );
      const rawResult = calloutIds.map((id) => ({
        calloutId: id,
        count: '1',
      }));
      const qb = createBatchQueryBuilderMock(rawResult);
      (repository.createQueryBuilder as Mock).mockReturnValue(qb);

      const result = await service.getContributionsCountBatch(calloutIds);

      expect(result.size).toBe(100);
      for (const id of calloutIds) {
        expect(result.get(id)).toBe(1);
      }
    });
  });
});
