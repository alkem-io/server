import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';

describe('ChallengeResolver', () => {
  let resolver: ChallengeResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<ChallengeResolverMutations>(
      ChallengeResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
