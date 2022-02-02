import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { CommentsResolverMutations } from './comments.resolver.mutations';

describe('CommentsResolverMutations', () => {
  let resolver: CommentsResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<CommentsResolverMutations>(CommentsResolverMutations);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
