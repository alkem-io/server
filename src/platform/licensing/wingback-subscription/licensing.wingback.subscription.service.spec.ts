import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Test, TestingModule } from '@nestjs/testing';
import { WingbackManager } from '@services/external/wingback';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';
import { WingbackFeatureNames } from './wingback.constants';

describe('LicensingWingbackSubscriptionService', () => {
  let service: LicensingWingbackSubscriptionService;
  let wingbackManager: any;

  beforeEach(async () => {
    wingbackManager = {
      isEnabled: vi.fn(),
      createCustomer: vi.fn(),
      getEntitlements: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingWingbackSubscriptionService,
        MockWinstonProvider,
        {
          provide: WingbackManager,
          useValue: wingbackManager,
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

  describe('isEnabled', () => {
    it('should delegate to wingbackManager.isEnabled', () => {
      wingbackManager.isEnabled.mockReturnValue(true);

      expect(service.isEnabled()).toBe(true);
      expect(wingbackManager.isEnabled).toHaveBeenCalled();
    });

    it('should return false when wingbackManager is disabled', () => {
      wingbackManager.isEnabled.mockReturnValue(false);

      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('createCustomer', () => {
    it('should delegate to wingbackManager.createCustomer', async () => {
      const data = { name: 'Test', email: 'test@example.com' } as any;
      wingbackManager.createCustomer.mockResolvedValue({ id: 'cust-1' });

      const result = await service.createCustomer(data);

      expect(result).toEqual({ id: 'cust-1' });
      expect(wingbackManager.createCustomer).toHaveBeenCalledWith(data);
    });
  });

  describe('getEntitlements', () => {
    it('should return mapped entitlements for per_unit features', async () => {
      wingbackManager.getEntitlements.mockResolvedValue([
        {
          name: 'Free Space',
          slug: WingbackFeatureNames.ACCOUNT_SPACE_FREE,
          original_feature_id: 'feat-1',
          entitlement_details: {
            pricing_strategy: 'per_unit',
            contracted_unit_count: '3',
            unit_name: 'spaces',
            used_unit_count: '1',
            minimum_units: '0',
            maximum_units: '10',
          },
        },
        {
          name: 'VC',
          slug: WingbackFeatureNames.ACCOUNT_VIRTUAL_CONTRIBUTOR,
          original_feature_id: 'feat-2',
          entitlement_details: {
            pricing_strategy: 'per_unit',
            contracted_unit_count: '5',
            unit_name: 'vcs',
            used_unit_count: '2',
            minimum_units: '0',
            maximum_units: null,
          },
        },
      ]);

      const result = await service.getEntitlements('cust-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 3,
      });
      expect(result[1]).toEqual({
        type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        limit: 5,
      });
    });

    it('should filter out non-per_unit features', async () => {
      wingbackManager.getEntitlements.mockResolvedValue([
        {
          name: 'Flat Feature',
          slug: 'FLAT_FEATURE',
          original_feature_id: 'feat-flat',
          entitlement_details: {
            pricing_strategy: 'flat',
          },
        },
        {
          name: 'Free Space',
          slug: WingbackFeatureNames.ACCOUNT_SPACE_FREE,
          original_feature_id: 'feat-1',
          entitlement_details: {
            pricing_strategy: 'per_unit',
            contracted_unit_count: '2',
            unit_name: 'spaces',
            used_unit_count: '0',
            minimum_units: '0',
            maximum_units: '5',
          },
        },
      ]);

      const result = await service.getEntitlements('cust-1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(LicenseEntitlementType.ACCOUNT_SPACE_FREE);
    });

    it('should filter out per_unit features with unsupported slug', async () => {
      wingbackManager.getEntitlements.mockResolvedValue([
        {
          name: 'Unknown',
          slug: 'UNKNOWN_FEATURE',
          original_feature_id: 'feat-unknown',
          entitlement_details: {
            pricing_strategy: 'per_unit',
            contracted_unit_count: '1',
            unit_name: 'things',
            used_unit_count: '0',
            minimum_units: '0',
            maximum_units: '10',
          },
        },
      ]);

      const result = await service.getEntitlements('cust-1');

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no features returned', async () => {
      wingbackManager.getEntitlements.mockResolvedValue([]);

      const result = await service.getEntitlements('cust-1');

      expect(result).toHaveLength(0);
    });
  });
});
