import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';

describe('OpportunityResolver', () => {
  let resolver: OpportunityResolverMutations;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<OpportunityResolverMutations>(
      OpportunityResolverMutations
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
