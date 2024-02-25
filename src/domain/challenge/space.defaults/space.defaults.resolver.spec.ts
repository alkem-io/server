import { Test, TestingModule } from '@nestjs/testing';
import { SpaceDefaultsResolverMutations } from './space.defaults.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('SpaceDefaultsResolver', () => {
  let resolver: SpaceDefaultsResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceDefaultsResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(SpaceDefaultsResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
