import { Test, TestingModule } from '@nestjs/testing';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('AspectResolver', () => {
  let resolver: AspectResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AspectResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AspectResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
