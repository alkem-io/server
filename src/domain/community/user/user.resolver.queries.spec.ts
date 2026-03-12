import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UserResolverQueries } from './user.resolver.queries';

describe('UserResolverQueries', () => {
  let resolver: UserResolverQueries;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserResolverQueries, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<UserResolverQueries>(UserResolverQueries);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
