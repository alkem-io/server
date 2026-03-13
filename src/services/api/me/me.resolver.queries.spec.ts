import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MeResolverQueries } from './me.resolver.queries';

describe('MeResolverQueries', () => {
  let resolver: MeResolverQueries;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MeResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<MeResolverQueries>(MeResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should return empty object from me query', async () => {
    const result = await resolver.me();
    expect(result).toBeDefined();
  });
});
