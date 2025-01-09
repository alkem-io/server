import { Test, TestingModule } from '@nestjs/testing';
import { WingbackWebhooksService } from './wingback-webhooks.service';

describe('WingbackWebhooksService', () => {
  let service: WingbackWebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WingbackWebhooksService],
    }).compile();

    service = module.get<WingbackWebhooksService>(WingbackWebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
