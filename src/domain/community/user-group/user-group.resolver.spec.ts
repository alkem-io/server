import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { UserGroupResolverMutations } from './user-group.resolver.mutations';

describe('UserGroupResolver', () => {
  let resolver: UserGroupResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<UserGroupResolverMutations>(
      UserGroupResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
