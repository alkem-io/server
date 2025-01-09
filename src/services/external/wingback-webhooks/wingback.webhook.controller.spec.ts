import { Test, TestingModule } from '@nestjs/testing';
import { WingbackWebhooksController } from './wingback-webhooks.controller';

describe('WingbackWebhooksController', () => {
  let controller: WingbackWebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WingbackWebhooksController],
    }).compile();

    controller = module.get<WingbackWebhooksController>(WingbackWebhooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
