import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LookupResolverQueries } from './lookup.resolver.queries';

describe('LookupResolverQueries', () => {
  let resolver: LookupResolverQueries;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<LookupResolverQueries>(LookupResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return empty object from lookup query', async () => {
    const result = await resolver.lookup();
    expect(result).toBeDefined();
  });
});
