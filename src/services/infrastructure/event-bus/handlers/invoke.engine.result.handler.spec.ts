import { Test, TestingModule } from '@nestjs/testing';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { InvokeEngineResult } from '../messages/invoke.engine.result';
import { InvokeEngineResultHandler } from './invoke.engine.result.handler';

describe('InvokeEngineResultHandler', () => {
  let handler: InvokeEngineResultHandler;
  let aiServerService: { handleInvokeEngineResult: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvokeEngineResultHandler],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    handler = module.get(InvokeEngineResultHandler);
    aiServerService = module.get(AiServerService) as any;
  });

  describe('handle', () => {
    it('should delegate to aiServerService.handleInvokeEngineResult', async () => {
      const event = new InvokeEngineResult(
        { engine: 'test-engine' } as any,
        { message: 'response', result: 'success', sources: [] } as any
      );

      await handler.handle(event);

      expect(aiServerService.handleInvokeEngineResult).toHaveBeenCalledWith(
        event
      );
    });
  });
});
