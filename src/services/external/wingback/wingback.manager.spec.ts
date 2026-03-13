import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WingbackCustomerNotCreated } from './exceptions/wingback.customer.not.created';
import { WingbackCustomerNotFound } from './exceptions/wingback.customer.not.found';
import { WingbackCustomerNotRemoved } from './exceptions/wingback.customer.not.removed';
import { WingbackManager } from './wingback.manager';

const mockWingbackConfig = {
  key: 'test-api-key',
  endpoint: 'https://api.wingback.com',
  enabled: true,
  retries: 2,
  timeout: 5000,
};

describe('WingbackManager', () => {
  let manager: WingbackManager;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WingbackManager,
        MockWinstonProvider,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(mockWingbackConfig),
          },
        },
        {
          provide: HttpService,
          useValue: {
            request: vi.fn(),
          },
        },
      ],
    }).compile();

    manager = module.get<WingbackManager>(WingbackManager);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it('should return false when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WingbackManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi
                .fn()
                .mockReturnValue({ ...mockWingbackConfig, enabled: false }),
            },
          },
          {
            provide: HttpService,
            useValue: { request: vi.fn() },
          },
        ],
      }).compile();

      const disabledManager = module.get<WingbackManager>(WingbackManager);
      expect(disabledManager.isEnabled()).toBe(false);
    });
  });

  describe('getContract', () => {
    it('should throw when wingback is not enabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WingbackManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi
                .fn()
                .mockReturnValue({ ...mockWingbackConfig, enabled: false }),
            },
          },
          {
            provide: HttpService,
            useValue: { request: vi.fn() },
          },
        ],
      }).compile();

      const disabledManager = module.get<WingbackManager>(WingbackManager);

      expect(() => disabledManager.getContract('contract-1')).toThrow(
        'Wingback is not enabled'
      );
    });

    it('should return contract data on success', async () => {
      const contractData = {
        contract_summary: { customer_id: 'cust-1' },
      };

      vi.mocked(httpService.request).mockReturnValue(
        of({ data: contractData } as AxiosResponse)
      );

      const result = await manager.getContract('contract-1');
      expect(result).toEqual(contractData);
    });
  });

  describe('createCustomer', () => {
    it('should throw when wingback is not enabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WingbackManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi
                .fn()
                .mockReturnValue({ ...mockWingbackConfig, enabled: false }),
            },
          },
          {
            provide: HttpService,
            useValue: { request: vi.fn() },
          },
        ],
      }).compile();

      const disabledManager = module.get<WingbackManager>(WingbackManager);

      await expect(
        disabledManager.createCustomer({ name: 'Test' })
      ).rejects.toThrow('Wingback is not enabled');
    });

    it('should return customer id on success', async () => {
      vi.mocked(httpService.request).mockReturnValue(
        of({ data: 'cust-new-id' } as AxiosResponse)
      );

      const result = await manager.createCustomer({ name: 'Test Customer' });
      expect(result).toEqual({ id: 'cust-new-id' });
    });

    it('should throw WingbackCustomerNotCreated on failure', async () => {
      const axiosError = new AxiosError('Bad Request');
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid data' },
        headers: {},
        config: {} as any,
      };

      vi.mocked(httpService.request).mockReturnValue(
        throwError(() => axiosError)
      );

      await expect(manager.createCustomer({ name: 'Test' })).rejects.toThrow(
        WingbackCustomerNotCreated
      );
    });
  });

  describe('removeCustomer', () => {
    it('should throw when wingback is not enabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WingbackManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi
                .fn()
                .mockReturnValue({ ...mockWingbackConfig, enabled: false }),
            },
          },
          {
            provide: HttpService,
            useValue: { request: vi.fn() },
          },
        ],
      }).compile();

      const disabledManager = module.get<WingbackManager>(WingbackManager);

      await expect(disabledManager.removeCustomer('cust-1')).rejects.toThrow(
        'Wingback is not enabled'
      );
    });

    it('should throw WingbackCustomerNotFound when customer does not exist', async () => {
      // getCustomer will call sendGet which throws, causing getCustomer to return undefined
      vi.mocked(httpService.request).mockReturnValue(
        throwError(() => new Error('Not found'))
      );

      await expect(manager.removeCustomer('cust-missing')).rejects.toThrow(
        WingbackCustomerNotFound
      );
    });

    it('should return true on successful removal', async () => {
      // First call: getCustomer (sendGet), second call: sendDelete
      vi.mocked(httpService.request)
        .mockReturnValueOnce(of({ data: { id: 'cust-1' } } as AxiosResponse))
        .mockReturnValueOnce(of({ data: true } as AxiosResponse));

      const result = await manager.removeCustomer('cust-1');
      expect(result).toBe(true);
    });

    it('should throw WingbackCustomerNotRemoved when delete fails', async () => {
      // First call: getCustomer success
      vi.mocked(httpService.request).mockReturnValueOnce(
        of({ data: { id: 'cust-1' } } as AxiosResponse)
      );

      // Second call: sendDelete fails with AxiosError (4xx so no retry)
      const axiosError = new AxiosError('Forbidden');
      axiosError.response = {
        status: 403,
        statusText: 'Forbidden',
        data: { message: 'Cannot delete' },
        headers: {},
        config: {} as any,
      };

      vi.mocked(httpService.request).mockReturnValueOnce(
        throwError(() => axiosError)
      );

      await expect(manager.removeCustomer('cust-1')).rejects.toThrow(
        WingbackCustomerNotRemoved
      );
    });
  });

  describe('getEntitlements', () => {
    it('should throw BaseExceptionInternal when not enabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WingbackManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: {
              get: vi
                .fn()
                .mockReturnValue({ ...mockWingbackConfig, enabled: false }),
            },
          },
          {
            provide: HttpService,
            useValue: { request: vi.fn() },
          },
        ],
      }).compile();

      const disabledManager = module.get<WingbackManager>(WingbackManager);

      await expect(disabledManager.getEntitlements('cust-1')).rejects.toThrow(
        BaseExceptionInternal
      );
    });

    it('should return features from first subscription', async () => {
      const features = [{ name: 'feature-1', slug: 'f1' }];
      const entitlements = [
        {
          plan: { name: 'Pro', features },
          customer: { status: 'active' },
          contract: { contract_id: 'c1', status: 'active' },
        },
      ];

      vi.mocked(httpService.request).mockReturnValue(
        of({ data: entitlements } as AxiosResponse)
      );

      const result = await manager.getEntitlements('cust-1');
      expect(result).toEqual(features);
    });

    it('should throw when no subscriptions found', async () => {
      vi.mocked(httpService.request).mockReturnValue(
        of({ data: [] } as AxiosResponse)
      );

      await expect(manager.getEntitlements('cust-1')).rejects.toThrow(
        'No subscriptions found for customer'
      );
    });
  });

  describe('getCustomer', () => {
    it('should return customer data on success', async () => {
      const customerData = { id: 'cust-1', name: 'Test' };
      vi.mocked(httpService.request).mockReturnValue(
        of({ data: customerData } as AxiosResponse)
      );

      const result = await manager.getCustomer('cust-1');
      expect(result).toEqual(customerData);
    });

    it('should return undefined on error', async () => {
      vi.mocked(httpService.request).mockReturnValue(
        throwError(() => new Error('Not found'))
      );

      const result = await manager.getCustomer('cust-missing');
      expect(result).toBeUndefined();
    });
  });

  describe('unimplemented methods', () => {
    it('triggerPaymentSession should throw', () => {
      expect(() => manager.triggerPaymentSession()).toThrow(
        'Method not implemented'
      );
    });

    it('assignPlan should throw', () => {
      expect(() => manager.assignPlan()).toThrow('Method not implemented');
    });

    it('activateCustomer should throw', () => {
      expect(() => manager.activateCustomer('cust-1')).toThrow(
        'Method not implemented'
      );
    });

    it('inactivateCustomer should throw', () => {
      expect(() => manager.inactivateCustomer('cust-1')).toThrow(
        'Method not implemented'
      );
    });

    it('updateCustomer should throw', () => {
      expect(() => manager.updateCustomer({ name: 'Test' } as any)).toThrow(
        'Method not implemented'
      );
    });
  });
});
