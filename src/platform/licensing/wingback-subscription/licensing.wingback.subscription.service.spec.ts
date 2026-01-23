import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';
import { WingbackManager } from '@services/external/wingback';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';

describe('LicensingWingbackSubscriptionService', () => {
  let service: LicensingWingbackSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingWingbackSubscriptionService,
        MockWinstonProvider,
        {
          provide: WingbackManager,
          useValue: {
            createCustomer: vi.fn(),
            getEntitlements: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LicensingWingbackSubscriptionService>(
      LicensingWingbackSubscriptionService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
