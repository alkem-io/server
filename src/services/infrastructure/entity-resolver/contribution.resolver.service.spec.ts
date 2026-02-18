import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityManager, EntityNotFoundError } from 'typeorm';
import { type Mocked } from 'vitest';
import { ContributionResolverService } from './contribution.resolver.service';

describe('ContributionResolverService', () => {
  let service: ContributionResolverService;
  let entityManager: Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContributionResolverService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ContributionResolverService);
    entityManager = module.get(getEntityManagerToken());
  });

  describe('getCalloutForPostContribution', () => {
    it('should return callout when found for post ID', async () => {
      const callout = { id: 'callout-1', name: 'Test Callout' };
      entityManager.findOne.mockResolvedValue(callout as any);

      const result = await service.getCalloutForPostContribution('post-1');

      expect(result).toBe(callout);
    });

    it('should throw EntityNotFoundError when no callout is found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCalloutForPostContribution('missing-post')
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('should pass additional options to the entity manager', async () => {
      const callout = { id: 'callout-1' };
      entityManager.findOne.mockResolvedValue(callout as any);

      await service.getCalloutForPostContribution('post-1', {
        relations: { framing: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          relations: { framing: true },
        })
      );
    });
  });

  describe('getContributionForPost', () => {
    it('should return contribution when found for post ID', async () => {
      const contribution = { id: 'contrib-1' };
      entityManager.findOne.mockResolvedValue(contribution as any);

      const result = await service.getContributionForPost('post-1');

      expect(result).toBe(contribution);
    });

    it('should throw EntityNotFoundError when no contribution is found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getContributionForPost('missing-post')
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('should pass additional options to the entity manager', async () => {
      const contribution = { id: 'contrib-1' };
      entityManager.findOne.mockResolvedValue(contribution as any);

      await service.getContributionForPost('post-1', {
        relations: { post: true },
      });

      expect(entityManager.findOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          relations: { post: true },
        })
      );
    });
  });
});
