import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { ContributionResolverService } from './contribution.resolver.service';

describe('ContributionResolverService', () => {
  let service: ContributionResolverService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContributionResolverService, mockDrizzleProvider, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ContributionResolverService);
    db = module.get(DRIZZLE);
  });

  describe('getCalloutForPostContribution', () => {
    it('should return callout when found for post ID', async () => {
      const callout = { id: 'callout-1', name: 'Test Callout' };
      db.query.calloutContributions.findFirst.mockResolvedValue({
        callout,
      });

      const result = await service.getCalloutForPostContribution('post-1');

      expect(result).toBe(callout);
    });

    it('should throw EntityNotFoundException when no contribution is found', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValue(null);

      await expect(
        service.getCalloutForPostContribution('missing-post')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when contribution has no callout', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValue({
        callout: null,
      });

      await expect(
        service.getCalloutForPostContribution('post-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getContributionForPost', () => {
    it('should return contribution when found for post ID', async () => {
      const contribution = { id: 'contrib-1' };
      db.query.calloutContributions.findFirst.mockResolvedValue(contribution);

      const result = await service.getContributionForPost('post-1');

      expect(result).toBe(contribution);
    });

    it('should throw EntityNotFoundException when no contribution is found', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValue(null);

      await expect(
        service.getContributionForPost('missing-post')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
