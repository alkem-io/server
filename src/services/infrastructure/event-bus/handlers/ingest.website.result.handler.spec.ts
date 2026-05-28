import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import {
  IngestWebsiteResponse,
  IngestWebsiteResult,
} from '../messages/ingest.website.result.event';
import { IngestionPurpose, IngestionResult } from '../messages/types';
import { IngestWebsiteResultHandler } from './ingest.website.result.handler';

const buildResult = (
  overrides: Partial<IngestWebsiteResponse> = {}
): IngestWebsiteResult => {
  const response = new IngestWebsiteResponse(
    overrides.bodyOfKnowledgeId ?? '',
    overrides.type ?? VirtualContributorBodyOfKnowledgeType.WEBSITE,
    overrides.purpose ?? IngestionPurpose.KNOWLEDGE,
    overrides.personaId ?? 'persona-1',
    overrides.timestamp ?? Date.now(),
    overrides.result ?? IngestionResult.SUCCESS,
    overrides.error
  );
  return new IngestWebsiteResult(response);
};

describe('IngestWebsiteResultHandler', () => {
  let handler: IngestWebsiteResultHandler;
  let aiServerService: {
    updatePersonaBoKLastUpdated: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestWebsiteResultHandler, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    handler = module.get(IngestWebsiteResultHandler);
    aiServerService = module.get(AiServerService) as any;
  });

  describe('handle', () => {
    it('should return early when response is missing entirely (defensive)', async () => {
      // Simulates the bug we fixed: pre-fix wire payloads without a `response`
      // wrapper would throw `Cannot read properties of undefined`.
      const event = new IngestWebsiteResult(
        undefined as unknown as IngestWebsiteResponse
      );

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should return early when response result is FAILURE', async () => {
      const event = buildResult({ result: IngestionResult.FAILURE });

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

    it('should return early when purpose is CONTEXT', async () => {
      const event = buildResult({ purpose: IngestionPurpose.CONTEXT });

      await handler.handle(event);

      expect(
        aiServerService.updatePersonaBoKLastUpdated
      ).not.toHaveBeenCalled();
    });

    it('should call updatePersonaBoKLastUpdated with response timestamp on success', async () => {
      const timestamp = 1700000000000;
      const event = buildResult({ timestamp });

      await handler.handle(event);

      expect(aiServerService.updatePersonaBoKLastUpdated).toHaveBeenCalledWith(
        'persona-1',
        new Date(timestamp)
      );
    });

    it('should use current date when response timestamp is falsy', async () => {
      const event = buildResult({ timestamp: 0 });

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
