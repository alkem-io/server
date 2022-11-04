import { ContextResolverMutations } from '@domain/context/context/context.resolver.mutations';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('CanvasTemplateResolverMutations', () => {
  //toDo fix this hack placeholder asap
  // let resolver: CanvasTemplateResolverMutations;
  let resolver: ContextResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // CanvasTemplateResolverMutations,
        ContextResolverMutations, //toDo fix this hack placeholder asap
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
