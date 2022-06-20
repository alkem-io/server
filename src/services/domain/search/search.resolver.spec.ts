import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SearchResolverQueries } from './search.resolver.queries';

describe('SearchResolver', () => {
  let resolver: SearchResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(SearchResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
