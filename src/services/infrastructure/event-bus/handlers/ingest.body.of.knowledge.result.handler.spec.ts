import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import {
  IngestBodyOfKnowledgeResponse,
  IngestBodyOfKnowledgeResult,
} from '../messages/ingest.body.of.knowledge.result.event';
import {
  ErrorCode,
  IngestionPurpose,
  IngestionResult,
} from '../messages/types';
import { IngestBodyOfKnowledgeResultHandler } from './ingest.body.of.knowledge.result.handler';

const buildResult = (
  overrides: Partial<IngestBodyOfKnowledgeResponse> = {}
): IngestBodyOfKnowledgeResult => {
  const response = new IngestBodyOfKnowledgeResponse(
    overrides.bodyOfKnowledgeId ?? 'bok-1',
    overrides.type ?? VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
    overrides.purpose ?? IngestionPurpose.KNOWLEDGE,
    overrides.personaId ?? 'persona-1',
    overrides.timestamp ?? Date.now(),
    overrides.result ?? IngestionResult.SUCCESS,
    overrides.error
  );
  return new IngestBodyOfKnowledgeResult(response);
};

describe('IngestBodyOfKnowledgeResultHandler', () => {
  let handler: IngestBodyOfKnowledgeResultHandler;
  let aiServerService: {
    updatePersonaBoKLastUpdated: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestBodyOfKnowledgeResultHandler, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    handler = module.get(IngestBodyOfKnowledgeResultHandler);
    aiServerService = module.get(AiServerService) as any;
  });

  describe('handle', () => {
    it('should return early when response is missing entirely (defensive)', async () => {
      // Simulates the bug we fixed: pre-fix wire payloads without a `response`
      // wrapper would silently drop here instead of throwing.
      const event = new IngestBodyOfKnowledgeResult(
        undefined as unknown as IngestBodyOfKnowledgeResponse
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when personaId is missing', async () => {
      const event = buildResult({ personaId: '' });

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when timestamp is falsy', async () => {
      const event = buildResult({ timestamp: 0 });

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when purpose is CONTEXT', async () => {
      const event = buildResult({ purpose: IngestionPurpose.CONTEXT });

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should call updatePersonaBoKLastUpdated with Date on success', async () => {
      const timestamp = 1700000000000;
      const event = buildResult({ timestamp });

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        new Date(timestamp)
      );
    });

    it('should call updatePersonaBoKLastUpdated with null on VECTOR_INSERT error', async () => {
      const event = buildResult({
        result: IngestionResult.FAILURE,
        error: { code: ErrorCode.VECTOR_INSERT, message: 'insert failed' },
      });

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        null
      );
    });

    it('should not call updatePersonaBoKLastUpdated on failure without VECTOR_INSERT error', async () => {
      const event = buildResult({
        result: IngestionResult.FAILURE,
        error: { message: 'some other error' },
      });

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });
  });
});
