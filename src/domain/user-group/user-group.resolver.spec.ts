import { Test, TestingModule } from '@nestjs/testing';
import { UserGroupResolver } from './user-group.resolver';

describe('UserGroupResolver', () => {
  let resolver: UserGroupResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserGroupResolver],
    }).compile();

    resolver = module.get<UserGroupResolver>(UserGroupResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
