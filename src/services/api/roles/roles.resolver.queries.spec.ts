import { Test, TestingModule } from '@nestjs/testing';
import { RolesResolverQueries } from './roles.resolver.queries';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('RolesResolverQueries', () => {
  let resolver: RolesResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RolesResolverQueries>(RolesResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
