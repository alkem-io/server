import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
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
  let urlGeneratorCacheService: UrlGeneratorCacheService;

  beforeEach(async () => {
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
