import { Test, TestingModule } from '@nestjs/testing';
import { PostResolverMutations } from './post.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('PostResolver', () => {
  let resolver: PostResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostResolverMutations, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PostResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
