import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationReceiverController } from './in.app.notification.receiver.controller';

describe('InAppNotificationReceiverController', () => {
  let controller: InAppNotificationReceiverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InAppNotificationReceiverController],
    }).compile();

    controller = module.get<InAppNotificationReceiverController>(
      InAppNotificationReceiverController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
