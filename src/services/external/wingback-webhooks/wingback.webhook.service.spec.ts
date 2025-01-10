import { Test, TestingModule } from '@nestjs/testing';
import { WingbackWebhookService } from './wingback.webhook.service';

describe('WingbackWebhookService', () => {
  let service: WingbackWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WingbackWebhookService],
    }).compile();

    service = module.get<WingbackWebhookService>(WingbackWebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
