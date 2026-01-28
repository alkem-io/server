import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { ActivityFeedService } from './activity.feed.service';

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityFeedService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ActivityFeedService>(ActivityFeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
