import { Test, TestingModule } from '@nestjs/testing';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ActorResolver', () => {
  let resolver: ActorResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActorResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ActorResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
