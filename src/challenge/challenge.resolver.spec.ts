import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeResolver } from './challenge.resolver';

describe('ChallengeResolver', () => {
  let resolver: ChallengeResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChallengeResolver],
    }).compile();

    resolver = module.get<ChallengeResolver>(ChallengeResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
