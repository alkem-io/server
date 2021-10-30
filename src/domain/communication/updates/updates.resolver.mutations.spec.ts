import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { DiscussionResolverMutations } from './updates.resolver.mutations';

describe('DiscussionResolver', () => {
  let resolver: DiscussionResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<DiscussionResolverMutations>(
      DiscussionResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
