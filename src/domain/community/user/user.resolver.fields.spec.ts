import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UserResolverFields } from './user.resolver.fields';

describe('UserResolverFields', () => {
  let resolver: UserResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserResolverFields, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<UserResolverFields>(UserResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
