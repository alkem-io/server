import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { Callout } from '../callout/callout.entity';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { CalloutContributionService } from './callout.contribution.service';

describe('CalloutContributionMoveService', () => {
  let service: CalloutContributionMoveService;
  let calloutRepository: Repository<Callout>;
  let contributionRepository: Repository<CalloutContribution>;
  let contributionService: CalloutContributionService;
  let classificationService: ClassificationService;
  let urlGeneratorCacheService: UrlGeneratorCacheService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionMoveService,
        repositoryProviderMockFactory(Callout),
        repositoryProviderMockFactory(CalloutContribution),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutContributionMoveService);
    calloutRepository = module.get(getRepositoryToken(Callout));
    contributionRepository = module.get(
      getRepositoryToken(CalloutContribution)
    );
    contributionService = module.get(CalloutContributionService);
    classificationService = module.get(ClassificationService);
    urlGeneratorCacheService = module.get(UrlGeneratorCacheService);
  });

  describe('moveContributionToCallout', () => {
    const calloutsSetId = 'callouts-set-1';

    function createContribution(
      overrides: Partial<{
        post: any;
        whiteboard: any;
        link: any;
        memo: any;
      }> = {}
    ) {
      return {
        id: 'contribution-1',
        callout: {
          id: 'source-callout',
          calloutsSet: { id: calloutsSetId },
        },
        post: overrides.post,
        whiteboard: overrides.whiteboard,
        link: overrides.link,
        memo: overrides.memo,
      } as CalloutContribution;
    }

    function createTargetCallout(
      allowedTypes: CalloutContributionType[],
      targetCalloutsSetId = calloutsSetId
    ) {
      return {
        id: 'target-callout',
        calloutsSet: { id: targetCalloutsSetId },
        settings: {
          contribution: { allowedTypes },
        },
      } as any;
    }

    it('should move a post contribution to a target callout that allows posts', async () => {
      const contribution = createContribution({
        post: { profile: { id: 'post-profile-id' } },
      });
      const targetCallout = createTargetCallout([CalloutContributionType.POST]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);
      vi.mocked(contributionRepository.save).mockResolvedValue(contribution);
      vi.mocked(urlGeneratorCacheService.revokeUrlCache).mockResolvedValue(
        undefined as any
      );

      const result = await service.moveContributionToCallout(
        'contribution-1',
        'target-callout'
      );

      expect(result.callout).toBe(targetCallout);
      expect(urlGeneratorCacheService.revokeUrlCache).toHaveBeenCalledWith(
        'post-profile-id'
      );
      expect(contributionRepository.save).toHaveBeenCalledWith(contribution);
    });

    // A Tasks board target callout: its classification carries the reserved
    // `task` tagset whose template lists the board's columns.
    function createBoardTargetCallout(columns: string[]) {
      return {
        id: 'target-board',
        calloutsSet: { id: calloutsSetId },
        settings: {
          contribution: { allowedTypes: [CalloutContributionType.POST] },
        },
        classification: {
          tagsets: [
            {
              name: TagsetReservedName.TASK,
              tagsetTemplate: { allowedValues: columns },
            },
          ],
        },
      } as any;
    }

    it('seeds a task-column classification (first column) when moving a post INTO a Tasks board', async () => {
      const contribution = createContribution({
        post: { profile: { id: 'post-profile-id' } },
      });
      const targetBoard = createBoardTargetCallout(['To Do', 'In Progress']);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetBoard);
      vi.mocked(classificationService.createClassification).mockReturnValue({
        id: 'new-classification',
      } as any);
      vi.mocked(contributionRepository.save).mockImplementation(
        async (c: any) => c
      );

      await service.moveContributionToCallout('contribution-1', 'target-board');

      expect(classificationService.createClassification).toHaveBeenCalledWith(
        [{ allowedValues: ['To Do', 'In Progress'] }],
        { tagsets: [{ name: TagsetReservedName.TASK, tags: ['To Do'] }] }
      );
      // No previous classification to delete.
      expect(classificationService.deleteClassification).not.toHaveBeenCalled();
      expect((contribution as any).classification).toEqual({
        id: 'new-classification',
      });
    });

    it('drops the task classification when moving a task OUT to an ordinary callout', async () => {
      const contribution = {
        ...createContribution({ post: { profile: { id: 'post-profile-id' } } }),
        classification: { id: 'old-classification' },
      } as any;
      const targetCallout = createTargetCallout([CalloutContributionType.POST]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);
      vi.mocked(contributionRepository.save).mockImplementation(
        async (c: any) => c
      );

      await service.moveContributionToCallout(
        'contribution-1',
        'target-callout'
      );

      expect(contribution.classification).toBeNull();
      expect(classificationService.createClassification).not.toHaveBeenCalled();
      expect(classificationService.deleteClassification).toHaveBeenCalledWith(
        'old-classification'
      );
    });

    it('re-seeds the classification when moving a task between two Tasks boards', async () => {
      const contribution = {
        ...createContribution({ post: { profile: { id: 'post-profile-id' } } }),
        classification: { id: 'old-classification' },
      } as any;
      const targetBoard = createBoardTargetCallout(['Backlog', 'Done']);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetBoard);
      vi.mocked(classificationService.createClassification).mockReturnValue({
        id: 'new-classification',
      } as any);
      vi.mocked(contributionRepository.save).mockImplementation(
        async (c: any) => c
      );

      await service.moveContributionToCallout('contribution-1', 'target-board');

      expect(classificationService.createClassification).toHaveBeenCalledWith(
        [{ allowedValues: ['Backlog', 'Done'] }],
        { tagsets: [{ name: TagsetReservedName.TASK, tags: ['Backlog'] }] }
      );
      expect(classificationService.deleteClassification).toHaveBeenCalledWith(
        'old-classification'
      );
    });

    it('should throw EntityNotFoundException when target callout is not found', async () => {
      const contribution = createContribution();
      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(null);

      await expect(
        service.moveContributionToCallout('contribution-1', 'nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw NotSupportedException when target callout does not allow POST contributions', async () => {
      const contribution = createContribution({
        post: { profile: { id: 'p-id' } },
      });
      const targetCallout = createTargetCallout([
        CalloutContributionType.WHITEBOARD,
      ]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);

      await expect(
        service.moveContributionToCallout('contribution-1', 'target-callout')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw NotSupportedException when target callout does not allow WHITEBOARD contributions', async () => {
      const contribution = createContribution({
        whiteboard: { profile: { id: 'wb-id' } },
      });
      const targetCallout = createTargetCallout([CalloutContributionType.POST]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);

      await expect(
        service.moveContributionToCallout('contribution-1', 'target-callout')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw NotSupportedException when target callout does not allow LINK contributions', async () => {
      const contribution = createContribution({
        link: { profile: { id: 'link-id' } },
      });
      const targetCallout = createTargetCallout([CalloutContributionType.POST]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);

      await expect(
        service.moveContributionToCallout('contribution-1', 'target-callout')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw NotSupportedException when target callout does not allow MEMO contributions', async () => {
      const contribution = createContribution({
        memo: { profile: { id: 'memo-id' } },
      });
      const targetCallout = createTargetCallout([CalloutContributionType.POST]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);

      await expect(
        service.moveContributionToCallout('contribution-1', 'target-callout')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw NotSupportedException when callouts belong to different CalloutsSet', async () => {
      const contribution = createContribution({
        post: { profile: { id: 'p-id' } },
      });
      const targetCallout = createTargetCallout(
        [CalloutContributionType.POST],
        'different-callouts-set'
      );

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);

      await expect(
        service.moveContributionToCallout('contribution-1', 'target-callout')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should revoke URL cache for whiteboard profile when moving whiteboard contribution', async () => {
      const contribution = createContribution({
        whiteboard: { profile: { id: 'wb-profile-id' } },
      });
      const targetCallout = createTargetCallout([
        CalloutContributionType.WHITEBOARD,
      ]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);
      vi.mocked(contributionRepository.save).mockResolvedValue(contribution);
      vi.mocked(urlGeneratorCacheService.revokeUrlCache).mockResolvedValue(
        undefined as any
      );

      await service.moveContributionToCallout(
        'contribution-1',
        'target-callout'
      );

      expect(urlGeneratorCacheService.revokeUrlCache).toHaveBeenCalledWith(
        'wb-profile-id'
      );
    });

    it('should revoke URL cache for memo profile when moving memo contribution', async () => {
      const contribution = createContribution({
        memo: { profile: { id: 'memo-profile-id' } },
      });
      const targetCallout = createTargetCallout([CalloutContributionType.MEMO]);

      vi.mocked(
        contributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      vi.mocked(calloutRepository.findOne).mockResolvedValue(targetCallout);
      vi.mocked(contributionRepository.save).mockResolvedValue(contribution);
      vi.mocked(urlGeneratorCacheService.revokeUrlCache).mockResolvedValue(
        undefined as any
      );

      await service.moveContributionToCallout(
        'contribution-1',
        'target-callout'
      );

      expect(urlGeneratorCacheService.revokeUrlCache).toHaveBeenCalledWith(
        'memo-profile-id'
      );
    });
  });
});
