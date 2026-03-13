import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { UserGroupResolverFields } from './user-group.resolver.fields';

describe('UserGroupResolverFields', () => {
  let resolver: UserGroupResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<UserGroupResolverFields>(UserGroupResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
