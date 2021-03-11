import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { CommunityResolverMutations } from './community.resolver.mutations';

describe('CommunityResolver', () => {
  let resolver: CommunityResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<CommunityResolverMutations>(
      CommunityResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
