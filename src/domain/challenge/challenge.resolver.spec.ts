import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';

describe('ChallengeResolver', () => {
  let resolver: ChallengeResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChallengeResolverMutations],
    }).compile();

    resolver = module.get<ChallengeResolverMutations>(
      ChallengeResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
