import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AspectTemplateResolverMutations } from './aspect.template.resolver.mutations';

describe('AspectTemplateResolverMutations', () => {
  let resolver: AspectTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AspectTemplateResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AspectTemplateResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
