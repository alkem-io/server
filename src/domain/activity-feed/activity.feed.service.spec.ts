import { Test, TestingModule } from '@nestjs/testing';
import { ActivityFeedService } from './activity.feed.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockWinstonProvider } from '@test/mocks';

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
