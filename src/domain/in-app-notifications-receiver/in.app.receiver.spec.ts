import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationReceiver } from './inAppNotificationReceiver';

describe('InAppReceiverServiceService', () => {
  let service: InAppNotificationReceiver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InAppNotificationReceiver],
    }).compile();

    service = module.get<InAppNotificationReceiver>(InAppNotificationReceiver);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
