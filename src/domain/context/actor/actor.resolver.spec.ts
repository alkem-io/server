import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ActorResolverMutations } from './actor.resolver.mutations';

describe('ActorResolver', () => {
  let resolver: ActorResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ActorResolverMutations>(ActorResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
