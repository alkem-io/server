import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { UserGroupResolver } from './user-group.resolver';

describe('UserGroupResolver', () => {
  let resolver: UserGroupResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<UserGroupResolver>(UserGroupResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
