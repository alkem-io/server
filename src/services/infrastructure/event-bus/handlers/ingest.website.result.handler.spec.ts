import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IngestionPurpose, IngestWebsite } from '../messages/ingest.website';
import {
  IngestWebsiteResponse,
  IngestWebsiteResult,
} from '../messages/ingest.website.result.event';
import { IngestionResult } from '../messages/types';
import { IngestWebsiteResultHandler } from './ingest.website.result.handler';

describe('IngestWebsiteResultHandler', () => {
  let handler: IngestWebsiteResultHandler;
  let aiServerService: {
    updatePersonaBoKLastUpdated: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestWebsiteResultHandler, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    handler = module.get(IngestWebsiteResultHandler);
    aiServerService = module.get(AiServerService) as any;
  });

  describe('handle', () => {
    it('should return early when response result is FAILURE', async () => {
      const original = new IngestWebsite(
        'https://example.com',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1'
      );
      const response = new IngestWebsiteResponse(
        Date.now(),
        IngestionResult.FAILURE
      );
      const event = new IngestWebsiteResult(original, response);

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when personaId is undefined', async () => {
      const original = new IngestWebsite(
        'https://example.com',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE
        // no personaId
      );
      const response = new IngestWebsiteResponse(
        Date.now(),
        IngestionResult.SUCCESS
      );
      const event = new IngestWebsiteResult(original, response);

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should call updatePersonaBoKLastUpdated with response timestamp on success', async () => {
      const timestamp = 1700000000000;
      const original = new IngestWebsite(
        'https://example.com',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1'
      );
      const response = new IngestWebsiteResponse(
        timestamp,
        IngestionResult.SUCCESS
      );
      const event = new IngestWebsiteResult(original, response);

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        new Date(timestamp)
      );
    });

    it('should use current date when response timestamp is falsy', async () => {
      const original = new IngestWebsite(
        'https://example.com',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1'
      );
      const response = new IngestWebsiteResponse(
        0, // falsy timestamp
        IngestionResult.SUCCESS
      );
      const event = new IngestWebsiteResult(original, response);

      const beforeCall = Date.now();
      await handler.handle(event);
      const afterCall = Date.now();

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        expect.any(Date)
      );
      const calledDate = aiServerService.updatePersonaBoKLastUpdated.mock
        .calls[0][1] as Date;
      expect(calledDate.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(calledDate.getTime()).toBeLessThanOrEqual(afterCall);
    });
  });
});
