import { Test, TestingModule } from '@nestjs/testing';
import { WingbackWebhookController } from './wingback.webhook.controller';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('WingbackWebhookController', () => {
  let controller: WingbackWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WingbackWebhookController],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get<WingbackWebhookController>(
      WingbackWebhookController
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
