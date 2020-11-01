import { Test, TestingModule } from '@nestjs/testing';
import { ActorGroupResolver } from './actor-group.resolver';

describe('ActorGroupResolver', () => {
  let resolver: ActorGroupResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActorGroupResolver],
    }).compile();

    resolver = module.get<ActorGroupResolver>(ActorGroupResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
