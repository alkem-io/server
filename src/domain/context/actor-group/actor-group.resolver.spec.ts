import { Test, TestingModule } from '@nestjs/testing';
import { ActorGroupResolverMutations } from './actor-group.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ActorGroupResolver', () => {
  let resolver: ActorGroupResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActorGroupResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(ActorGroupResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
