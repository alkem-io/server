import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MetadataResolverQueries } from './metadata.resolver.queries';

describe('MetadataResolver', () => {
  let resolver: MetadataResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataResolverQueries,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MetadataResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
