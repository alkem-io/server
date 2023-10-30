import { Test, TestingModule } from '@nestjs/testing';
import { ActivityFeedService } from './activity.feed.service';

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityFeedService],
    }).compile();

    service = module.get<ActivityFeedService>(ActivityFeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
