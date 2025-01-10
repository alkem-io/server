import { Test, TestingModule } from '@nestjs/testing';
import { WingbackWebhookController } from './wingback.webhook.controller';

describe('WingbackWebhookController', () => {
  let controller: WingbackWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WingbackWebhookController],
    }).compile();

    controller = module.get<WingbackWebhookController>(
      WingbackWebhookController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
