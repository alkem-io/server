import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { InAppNotificationReceiver } from './in.app.notification.receiver';

describe('InAppReceiverServiceService', () => {
  let service: InAppNotificationReceiver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InAppNotificationReceiver],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InAppNotificationReceiver>(InAppNotificationReceiver);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
