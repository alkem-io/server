import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@common/exceptions';
import { ForbiddenLicensePolicyException } from '@common/exceptions/forbidden.license.policy.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { LicensePolicyService } from '../license-policy/license.policy.service';
import { LicensingCredentialBasedService } from './licensing.credential.based.service';

describe('LicensingCredentialBased.Service', () => {
  let service: LicensingCredentialBasedService;
  let licensePolicyService: LicensePolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingCredentialBasedService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensingCredentialBasedService);
    licensePolicyService = module.get(LicensePolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const makeAgent = (credentials: any[]) => ({
    id: 'agent-1',
    credentials,
  });

  const makePolicy = (credentialRules: any[]) => ({
    id: 'policy-1',
    credentialRules,
  });

  describe('isEntitlementGranted', () => {
    it('should return true when credential matches entitlement', async () => {
      const agent = makeAgent([{ type: 'license-plus' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 1,
            },
          ],
        },
      ]);

      const result = await service.isEntitlementGranted(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        policy as any
      );

      expect(result).toBe(true);
    });

    it('should return false when no credential matches', async () => {
      const agent = makeAgent([{ type: 'other-credential' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 1,
            },
          ],
        },
      ]);

      const result = await service.isEntitlementGranted(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        policy as any
      );

      expect(result).toBe(false);
    });

    it('should return false when entitlement type does not match', async () => {
      const agent = makeAgent([{ type: 'license-plus' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 1,
            },
          ],
        },
      ]);

      const result = await service.isEntitlementGranted(
        LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        agent as any,
        policy as any
      );

      expect(result).toBe(false);
    });

    it('should use default policy when none provided', async () => {
      const agent = makeAgent([{ type: 'license-plus' }]);
      const defaultPolicy = makePolicy([
        {
          name: 'default-rule',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 1,
            },
          ],
        },
      ]);

      (
        licensePolicyService.getDefaultLicensePolicyOrFail as Mock
      ).mockResolvedValue(defaultPolicy);

      const result = await service.isEntitlementGranted(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        undefined
      );

      expect(result).toBe(true);
    });
  });

  describe('grantEntitlementOrFail', () => {
    it('should return true when entitlement is granted', async () => {
      const agent = makeAgent([{ type: 'license-plus' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 1,
            },
          ],
        },
      ]);

      const result = await service.grantEntitlementOrFail(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        'test msg',
        policy as any
      );

      expect(result).toBe(true);
    });

    it('should throw ForbiddenLicensePolicyException when not granted', async () => {
      const agent = makeAgent([{ type: 'other' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [],
        },
      ]);

      await expect(
        service.grantEntitlementOrFail(
          LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          agent as any,
          'test msg',
          policy as any
        )
      ).rejects.toThrow(ForbiddenLicensePolicyException);
    });

    it('should use "no license policy" in error when policy is undefined', async () => {
      const agent = makeAgent([{ type: 'other' }]);
      const defaultPolicy = makePolicy([]);
      defaultPolicy.id = undefined as any;

      (
        licensePolicyService.getDefaultLicensePolicyOrFail as Mock
      ).mockResolvedValue(defaultPolicy);

      await expect(
        service.grantEntitlementOrFail(
          LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          agent as any,
          'test',
          undefined
        )
      ).rejects.toThrow(ForbiddenLicensePolicyException);
    });
  });

  describe('getEntitlementIfGranted', () => {
    it('should return the granted entitlement when matched', async () => {
      const grantedEntitlement = {
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 5,
      };
      const agent = makeAgent([{ type: 'license-plus' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [grantedEntitlement],
        },
      ]);

      const result = await service.getEntitlementIfGranted(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        policy as any
      );

      expect(result).toBe(grantedEntitlement);
    });

    it('should return undefined when no match', async () => {
      const agent = makeAgent([{ type: 'other' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [],
        },
      ]);

      const result = await service.getEntitlementIfGranted(
        LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        agent as any,
        policy as any
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getGrantedEntitlements', () => {
    it('should return unique granted entitlements with limit > 0', async () => {
      const agent = makeAgent([
        { type: 'license-plus' },
        { type: 'license-basic' },
      ]);
      const policy = makePolicy([
        {
          name: 'rule-plus',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 5,
            },
            {
              type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
              limit: 0, // should be excluded
            },
          ],
        },
        {
          name: 'rule-basic',
          credentialType: 'license-basic',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE, // duplicate
              limit: 1,
            },
          ],
        },
      ]);

      const result = await service.getGrantedEntitlements(
        agent as any,
        policy as any
      );

      expect(result).toEqual([LicenseEntitlementType.ACCOUNT_SPACE_FREE]);
    });

    it('should return empty array when no credentials match', async () => {
      const agent = makeAgent([{ type: 'unmatched' }]);
      const policy = makePolicy([
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [
            {
              type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
              limit: 5,
            },
          ],
        },
      ]);

      const result = await service.getGrantedEntitlements(
        agent as any,
        policy as any
      );

      expect(result).toEqual([]);
    });
  });

  describe('getCredentialsFromAgent (private, tested via public methods)', () => {
    it('should throw EntityNotFoundException when agent has no credentials', async () => {
      const agent = { id: 'agent-no-creds', credentials: undefined };
      const policy = makePolicy([]);

      await expect(
        service.isEntitlementGranted(
          LicenseEntitlementType.ACCOUNT_SPACE_FREE,
          agent as any,
          policy as any
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('convertCredentialRulesStr', () => {
    it('should parse valid JSON string', () => {
      const rules = [
        {
          name: 'rule-1',
          credentialType: 'license-plus',
          grantedEntitlements: [],
        },
      ];
      const rulesStr = JSON.stringify(rules);

      const result = service.convertCredentialRulesStr(rulesStr);

      expect(result).toEqual(rules);
    });

    it('should return empty array for empty string', () => {
      const result = service.convertCredentialRulesStr('');

      expect(result).toEqual([]);
    });

    it('should throw ForbiddenException for invalid JSON', () => {
      expect(() => service.convertCredentialRulesStr('not-json')).toThrow(
        ForbiddenException
      );
    });
  });
});
