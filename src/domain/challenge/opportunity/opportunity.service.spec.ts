import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { OpportunityService } from './opportunity.service';

describe('OpportunityService', () => {
  let service: OpportunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<OpportunityService>(OpportunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
