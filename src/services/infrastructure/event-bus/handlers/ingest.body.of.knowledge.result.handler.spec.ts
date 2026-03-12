import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IngestBodyOfKnowledgeResult } from '../messages/ingest.body.of.knowledge.result.event';
import {
  ErrorCode,
  IngestionPurpose,
  IngestionResult,
} from '../messages/types';
import { IngestBodyOfKnowledgeResultHandler } from './ingest.body.of.knowledge.result.handler';

describe('IngestBodyOfKnowledgeResultHandler', () => {
  let handler: IngestBodyOfKnowledgeResultHandler;
  let aiServerService: {
    updatePersonaBoKLastUpdated: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestBodyOfKnowledgeResultHandler, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    handler = module.get(IngestBodyOfKnowledgeResultHandler);
    aiServerService = module.get(AiServerService) as any;
  });

  describe('handle', () => {
    it('should return early when personaId is missing', async () => {
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        '', // empty personaId
        Date.now(),
        IngestionResult.SUCCESS
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when timestamp is falsy', async () => {
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1',
        0, // falsy timestamp
        IngestionResult.SUCCESS
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when purpose is CONTEXT', async () => {
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.CONTEXT,
        'persona-1',
        Date.now(),
        IngestionResult.SUCCESS
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should call updatePersonaBoKLastUpdated with Date on success', async () => {
      const timestamp = 1700000000000;
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1',
        timestamp,
        IngestionResult.SUCCESS
      );

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        new Date(timestamp)
      );
    });

    it('should call updatePersonaBoKLastUpdated with null on VECTOR_INSERT error', async () => {
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1',
        Date.now(),
        IngestionResult.FAILURE,
        { code: ErrorCode.VECTOR_INSERT, message: 'insert failed' }
      );

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        null
      );
    });

    it('should not call updatePersonaBoKLastUpdated on failure without VECTOR_INSERT error', async () => {
      const event = new IngestBodyOfKnowledgeResult(
        'bok-1',
        VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
        IngestionPurpose.KNOWLEDGE,
        'persona-1',
        Date.now(),
        IngestionResult.FAILURE,
        { message: 'some other error' }
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });
  });
});
