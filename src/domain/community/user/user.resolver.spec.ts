import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { UserResolverQueries } from './user.resolver.queries';
import { UserResolverMutations } from './user.resolver.mutations';

describe('UserResolver', () => {
  let resolver: UserResolverQueries;
  let resolverMutations: UserResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<UserResolverQueries>(UserResolverQueries);
    resolverMutations = module.get<UserResolverMutations>(
      UserResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
    expect(resolverMutations).toBeDefined();
  });
});
