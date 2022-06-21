import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('UserGroupResolverMutations', () => {
  let resolver: UserGroupResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserGroupResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<UserGroupResolverMutations>(
      UserGroupResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
