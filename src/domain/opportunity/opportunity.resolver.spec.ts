import { Test, TestingModule } from '@nestjs/testing';
import { OpportunityResolver } from './opportunity.resolver';

describe('OpportunityResolver', () => {
  let resolver: OpportunityResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpportunityResolver],
    }).compile();

    resolver = module.get<OpportunityResolver>(OpportunityResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
