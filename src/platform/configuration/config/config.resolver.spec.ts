import { Test, TestingModule } from '@nestjs/testing';
import { ConfigResolverQueries } from './config.resolver.queries';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('ConfigResolver', () => {
  let resolver: ConfigResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<ConfigResolverQueries>(ConfigResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
