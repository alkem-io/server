import { Test, TestingModule } from '@nestjs/testing';
import { LinkResolverMutations } from './link.resolver.mutations';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('LinkResolver', () => {
  let resolver: LinkResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkResolverMutations, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LinkResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
