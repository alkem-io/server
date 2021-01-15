import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OpportunityResolver } from './opportunity.resolver';

describe('OpportunityResolver', () => {
  let resolver: OpportunityResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    resolver = module.get<OpportunityResolver>(OpportunityResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
