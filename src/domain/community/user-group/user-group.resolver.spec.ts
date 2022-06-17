import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

const moduleMocker = new ModuleMocker(global);

describe('UserGroupResolverMutations', () => {
  let resolver: UserGroupResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserGroupResolverMutations, MockWinstonProvider],
    })
      .useMocker(token => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    resolver = module.get<UserGroupResolverMutations>(
      UserGroupResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
