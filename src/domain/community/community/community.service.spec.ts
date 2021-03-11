import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
