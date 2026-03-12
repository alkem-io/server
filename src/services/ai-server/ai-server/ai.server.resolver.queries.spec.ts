import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiServerResolverQueries } from './ai.server.resolver.queries';
import { AiServerService } from './ai.server.service';

describe('AiServerResolverQueries', () => {
  let resolver: AiServerResolverQueries;
  let aiServerService: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiServerResolverQueries],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AiServerResolverQueries);
    aiServerService = module.get(AiServerService) as unknown as Record<
      string,
      Mock
    >;
  });

  describe('aiServer', () => {
    it('should delegate to aiServerService.getAiServerOrFail', async () => {
      const aiServer = { id: 'server-1' };
      aiServerService.getAiServerOrFail.mockResolvedValue(aiServer);

      const result = await resolver.aiServer();

      expect(aiServerService.getAiServerOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(aiServer);
    });
  });
});
