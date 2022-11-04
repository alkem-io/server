import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CanvasTemplateResolverMutations } from './canvas.template.resolver.mutations';

describe('CanvasTemplateResolverMutations', () => {
  //toDo fix this hack placeholder asap
  let resolver: CanvasTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanvasTemplateResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CanvasTemplateResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
