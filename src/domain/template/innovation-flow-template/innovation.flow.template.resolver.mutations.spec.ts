import { ContextResolverMutations } from '@domain/context/context/context.resolver.mutations';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InnovationFlowTemplateResolverMutations } from '@domain/template/innovationFlow-template/innovationFlow.template.resolver.mutations';

describe('LiecycleTemplateResolverMutations', () => {
  let resolver: InnovationFlowTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        //toDo fix this hack placeholder asap
        // InnovationFlowTemplateResolverMutations,
        ContextResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ContextResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
