import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { EntityManager, Repository } from 'typeorm';
import { LicensePolicy } from './license.policy.entity';
import { LicensePolicyService } from './license.policy.service';
import { EntityNotFoundException } from '@common/exceptions';
import { ILicensePolicy } from './license.policy.interface';
import { vi } from 'vitest';

describe('LicensePolicyService', () => {
  let service: LicensePolicyService;
  let licensePolicyRepository: MockType<Repository<LicensePolicy>>;
  let entityManager: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensePolicyService,
        repositoryProviderMockFactory(LicensePolicy),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LicensePolicyService);
    licensePolicyRepository = module.get(getRepositoryToken(LicensePolicy));
    entityManager = module.get(EntityManager);
  });

  describe('getLicensePolicyOrFail', () => {
    it('should return the license policy when found', async () => {
      const policy = {
        id: 'policy-1',
        credentialRules: [],
      } as unknown as LicensePolicy;
      licensePolicyRepository.findOneBy!.mockResolvedValue(policy);

      const result = await service.getLicensePolicyOrFail('policy-1');

      expect(result).toBe(policy);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      licensePolicyRepository.findOneBy!.mockResolvedValue(null);

      await expect(
        service.getLicensePolicyOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getDefaultLicensePolicyOrFail', () => {
    it('should return the default policy when exactly one exists', async () => {
      const policy = {
        id: 'policy-1',
        credentialRules: [],
      } as unknown as LicensePolicy;
      vi.mocked(entityManager.findOne).mockResolvedValue(policy);

      const result = await service.getDefaultLicensePolicyOrFail();

      expect(result).toBe(policy);
    });

    it('should throw EntityNotFoundException when no default policy found', async () => {
      vi.mocked(entityManager.findOne).mockResolvedValue(null);

      await expect(
        service.getDefaultLicensePolicyOrFail()
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deleteLicensePolicyCredentialRule', () => {
    it('should remove the matching rule and save the policy', async () => {
      const rule1 = {
        id: 'rule-1',
        name: 'Rule 1',
        credentialType: 'TYPE_A' as any,
        grantedEntitlements: [],
      };
      const rule2 = {
        id: 'rule-2',
        name: 'Rule 2',
        credentialType: 'TYPE_B' as any,
        grantedEntitlements: [],
      };
      const policy = {
        id: 'policy-1',
        credentialRules: [rule1, rule2],
      } as unknown as ILicensePolicy;
      licensePolicyRepository.save!.mockResolvedValue(policy);

      const result = await service.deleteLicensePolicyCredentialRule(
        'rule-1',
        policy
      );

      expect(result.id).toBe('rule-1');
      expect(policy.credentialRules).toHaveLength(1);
      expect(policy.credentialRules[0].id).toBe('rule-2');
      expect(licensePolicyRepository.save).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when rule ID not found in policy', async () => {
      const policy = {
        id: 'policy-1',
        credentialRules: [
          {
            id: 'rule-1',
            name: 'Rule 1',
            credentialType: 'TYPE_A' as any,
            grantedEntitlements: [],
          },
        ],
      } as unknown as ILicensePolicy;

      await expect(
        service.deleteLicensePolicyCredentialRule('non-existent', policy)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('updateCredentialRule', () => {
    it('should update only the provided fields on the matching rule', async () => {
      const rule = {
        id: 'rule-1',
        name: 'Old Name',
        credentialType: 'TYPE_A' as any,
        grantedEntitlements: [],
      };
      const policy = {
        id: 'policy-1',
        credentialRules: [rule],
      } as unknown as ILicensePolicy;

      vi.mocked(entityManager.findOne).mockResolvedValue(
        policy as unknown as LicensePolicy
      );
      licensePolicyRepository.save!.mockResolvedValue(policy);

      const result = await service.updateCredentialRule({
        ID: 'rule-1',
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(result.credentialType).toBe('TYPE_A');
      expect(licensePolicyRepository.save).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when rule to update is not found', async () => {
      const policy = {
        id: 'policy-1',
        credentialRules: [],
      } as unknown as ILicensePolicy;

      vi.mocked(entityManager.findOne).mockResolvedValue(
        policy as unknown as LicensePolicy
      );

      await expect(
        service.updateCredentialRule({ ID: 'non-existent', name: 'New' })
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should update credentialType when provided', async () => {
      const rule = {
        id: 'rule-1',
        name: 'Rule',
        credentialType: 'TYPE_A' as any,
        grantedEntitlements: [],
      };
      const policy = {
        id: 'policy-1',
        credentialRules: [rule],
      } as unknown as ILicensePolicy;

      vi.mocked(entityManager.findOne).mockResolvedValue(
        policy as unknown as LicensePolicy
      );
      licensePolicyRepository.save!.mockResolvedValue(policy);

      const result = await service.updateCredentialRule({
        ID: 'rule-1',
        credentialType: 'TYPE_B' as any,
      });

      expect(result.credentialType).toBe('TYPE_B');
    });
  });
});
