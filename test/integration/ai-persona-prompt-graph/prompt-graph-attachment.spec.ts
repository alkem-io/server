import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { EncryptionService } from '@hedger/nestjs-encryption';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiPersona } from '@services/ai-server/ai-persona/ai.persona.entity';
import { AiPersonaService } from '@services/ai-server/ai-persona/ai.persona.service';
import { AiPersonaEngineAdapter } from '@services/ai-server/ai-persona-engine-adapter/ai.persona.engine.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import graphJson from '../../../src/services/ai-server/prompt-graph/config/prompt.graph.expert.json';

describe('AI persona prompt-graph attachment matrix', () => {
  let module: TestingModule;
  let service: AiPersonaService;
  let aiPersonaRepository: Record<string, Mock>;
  let aiPersonaEngineAdapter: Record<string, Mock>;

  const storedGraph = {
    nodes: [{ name: 'answer', system: false, prompt: 'Answer {question}' }],
    edges: [{ from: 'START', to: 'answer' }],
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [
        AiPersonaService,
        repositoryProviderMockFactory(AiPersona),
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === EncryptionService) {
          return {
            decrypt: vi.fn((value: string) => value),
            encrypt: vi.fn((value: string) => value),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AiPersonaService);
    aiPersonaRepository = module.get(getRepositoryToken(AiPersona));
    aiPersonaEngineAdapter = module.get(
      AiPersonaEngineAdapter
    ) as unknown as Record<string, Mock>;
    aiPersonaEngineAdapter.invoke.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await module.close();
  });

  const attachmentCases: Array<{
    name: string;
    engines: AiPersonaEngine[];
    graph?: typeof storedGraph;
    override?: object;
    expected: 'stored' | 'default' | 'absent';
  }> = [
    {
      name: 'expert with stored graph',
      engines: [AiPersonaEngine.EXPERT],
      graph: storedGraph,
      expected: 'stored',
    },
    {
      name: 'expert without stored graph',
      engines: [AiPersonaEngine.EXPERT],
      expected: 'default',
    },
    {
      name: 'expert with internal override',
      engines: [AiPersonaEngine.EXPERT],
      graph: storedGraph,
      override: { nodes: [], edges: [] },
      expected: 'absent',
    },
    {
      name: 'generic-openai with stored graph',
      engines: [AiPersonaEngine.GENERIC_OPENAI],
      graph: storedGraph,
      expected: 'stored',
    },
    {
      name: 'generic-openai without stored graph',
      engines: [AiPersonaEngine.GENERIC_OPENAI],
      expected: 'absent',
    },
    {
      name: 'generic-openai with internal override',
      engines: [AiPersonaEngine.GENERIC_OPENAI],
      graph: storedGraph,
      override: { nodes: [], edges: [] },
      expected: 'absent',
    },
    {
      name: 'excluded engines with a stored graph',
      engines: [
        AiPersonaEngine.GUIDANCE,
        AiPersonaEngine.OPENAI_ASSISTANT,
        AiPersonaEngine.LIBRA_FLOW,
        AiPersonaEngine.COMMUNITY_MANAGER,
      ],
      graph: storedGraph,
      expected: 'absent',
    },
  ];

  it.each(attachmentCases)('attaches the expected graph for $name', async ({
    engines,
    graph,
    override,
    expected,
  }) => {
    for (const engine of engines) {
      aiPersonaRepository.findOne.mockResolvedValue({
        id: 'persona-1',
        engine,
        prompt: ['test'],
        externalConfig: {},
        promptGraph: graph,
      });

      await service.invoke(
        {
          aiPersonaID: 'persona-1',
          message: 'Hello',
          displayName: 'VC',
          externalMetadata: {},
          resultHandler: { action: 'none' },
          promptGraph: override,
        } as any,
        []
      );

      const lastCall = aiPersonaEngineAdapter.invoke.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const adapterInput = lastCall![0];
      if (expected === 'stored') {
        expect(adapterInput.promptGraph).toBe(storedGraph);
      } else if (expected === 'default') {
        expect(adapterInput.promptGraph.nodes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'check_input',
              prompt: (graphJson.nodes[0].prompt as string[]).join('\n'),
            }),
          ])
        );
      } else {
        expect('promptGraph' in adapterInput).toBe(false);
      }
    }
  });
});
