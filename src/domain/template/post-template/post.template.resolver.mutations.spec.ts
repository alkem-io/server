import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PostTemplateResolverMutations } from './post.template.resolver.mutations';

describe('PostTemplateResolverMutations', () => {
  let resolver: PostTemplateResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostTemplateResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PostTemplateResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
