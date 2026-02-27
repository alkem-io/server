import { Test, TestingModule } from '@nestjs/testing';
import { MockConfigService } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils';
import { WingbackContractPayload } from './types';
import { WingbackWebhookController } from './wingback.webhook.controller';
import { WingbackWebhookService } from './wingback.webhook.service';

describe('WingbackWebhookController', () => {
  let controller: WingbackWebhookController;
  let service: WingbackWebhookService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      licensing: {
        wingback: {
          webhook_secret: {
            name: 'mock-secret-name',
            value: 'mock-secret-value',
          },
        },
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WingbackWebhookController],
      providers: [MockConfigService],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    controller = module.get<WingbackWebhookController>(
      WingbackWebhookController
    );
    service = module.get<WingbackWebhookService>(WingbackWebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('contractChanged', () => {
    it('should handle valid payload', () => {
      const payload: WingbackContractPayload = {
        id: 'Cont_a8032d52-0288-4ab0-95f5-fdcc03120f0',
      };
      controller.contractChanged(payload);
      expect(service.contractChanged).toHaveBeenCalledWith(payload);
      expect(service.contractChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe('newContract', () => {
    it('should handle valid payload', () => {
      const payload: WingbackContractPayload = {
        id: 'Cont_a8032d52-0288-4ab0-95f5-fdcc03120f0',
      };
      controller.newContract(payload);
      expect(service.newContract).toHaveBeenCalledWith(payload);
      expect(service.newContract).toHaveBeenCalledTimes(1);
    });
  });
});
