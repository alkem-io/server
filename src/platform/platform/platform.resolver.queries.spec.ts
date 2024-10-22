import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { PlatformResolverQueries } from './platform.resolver.queries';

describe('PlatformResolver', () => {
  let resolver: PlatformResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformResolverQueries,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(PlatformResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
