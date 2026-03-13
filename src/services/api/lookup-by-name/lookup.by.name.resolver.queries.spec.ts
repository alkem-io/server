import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LookupByNameResolverQueries } from './lookup.by.name.resolver.queries';

describe('LookupByNameResolverQueries', () => {
  let resolver: LookupByNameResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LookupByNameResolverQueries,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<LookupByNameResolverQueries>(
      LookupByNameResolverQueries
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
