import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { IAccount } from './account.interface';
import { AccountService } from './account.service';
import { AccountAuthorizationService } from './account.service.authorization';

describe('AccountAuthorizationService', () => {
  let service: AccountAuthorizationService;
  let accountService: AccountService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let platformAuthorizationService: PlatformAuthorizationPolicyService;
  let spaceAuthorizationService: SpaceAuthorizationService;
  let virtualContributorAuthorizationService: VirtualContributorAuthorizationService;
  let innovationPackAuthorizationService: InnovationPackAuthorizationService;
  let storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService;
  let innovationHubAuthorizationService: InnovationHubAuthorizationService;
  let licenseAuthorizationService: LicenseAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AccountAuthorizationService);
    accountService = module.get(AccountService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    platformAuthorizationService = module.get(
      PlatformAuthorizationPolicyService
    );
    spaceAuthorizationService = module.get(SpaceAuthorizationService);
    virtualContributorAuthorizationService = module.get(
      VirtualContributorAuthorizationService
    );
    innovationPackAuthorizationService = module.get(
      InnovationPackAuthorizationService
    );
    storageAggregatorAuthorizationService = module.get(
      StorageAggregatorAuthorizationService
    );
    innovationHubAuthorizationService = module.get(
      InnovationHubAuthorizationService
    );
    licenseAuthorizationService = module.get(LicenseAuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const createMockAccount = (overrides: Partial<IAccount> = {}): IAccount =>
    ({
      id: 'account-1',
      authorization: {
        id: 'auth-1',
        credentialRules: [],
        privilegeRules: [],
      },
      spaces: [],
      virtualContributors: [],
      innovationPacks: [],
      innovationHubs: [],
      storageAggregator: { id: 'storage-1' },
      license: { id: 'license-1' },
      ...overrides,
    }) as any;

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization policy to account and return updated authorizations', async () => {
      const mockAccount = createMockAccount();
      (accountService.getAccountOrFail as any).mockResolvedValue(mockAccount);
      (authorizationPolicyService.reset as any).mockReturnValue(
        mockAccount.authorization
      );
      (
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess as any
      ).mockReturnValue(mockAccount.authorization);
      (
        platformAuthorizationService.inheritRootAuthorizationPolicy as any
      ).mockReturnValue(mockAccount.authorization);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ criterias: [], cascade: false });
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockAccount.authorization);
      (authorizationPolicyService.save as any).mockResolvedValue(
        mockAccount.authorization
      );
      (
        authorizationPolicyService.cloneAuthorizationPolicy as any
      ).mockReturnValue(mockAccount.authorization);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(mockAccount);

      expect(result).toBeDefined();
      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        mockAccount.authorization
      );
      expect(authorizationPolicyService.save).toHaveBeenCalled();
    });

    it('should throw when storageAggregator is missing', async () => {
      const mockAccount = createMockAccount({
        storageAggregator: undefined,
      } as any);
      (accountService.getAccountOrFail as any).mockResolvedValue(mockAccount);

      await expect(
        service.applyAuthorizationPolicy(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when license is missing', async () => {
      const mockAccount = createMockAccount({ license: undefined } as any);
      (accountService.getAccountOrFail as any).mockResolvedValue(mockAccount);

      await expect(
        service.applyAuthorizationPolicy(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('applyAuthorizationPolicyForChildEntities', () => {
    it('should throw when spaces are missing', async () => {
      const mockAccount = createMockAccount({ spaces: undefined } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when virtualContributors are missing', async () => {
      const mockAccount = createMockAccount({
        virtualContributors: undefined,
      } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when innovationPacks are missing', async () => {
      const mockAccount = createMockAccount({
        innovationPacks: undefined,
      } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when storageAggregator is missing', async () => {
      const mockAccount = createMockAccount({
        storageAggregator: undefined,
      } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when innovationHubs are missing', async () => {
      const mockAccount = createMockAccount({
        innovationHubs: undefined,
      } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when license is missing', async () => {
      const mockAccount = createMockAccount({ license: undefined } as any);

      await expect(
        service.applyAuthorizationPolicyForChildEntities(mockAccount)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should process spaces, VCs, IPs, hubs, license, and storage aggregator', async () => {
      const mockAccount = createMockAccount({
        spaces: [{ id: 'space-1', nameID: 'space-name' }],
        virtualContributors: [{ id: 'vc-1' }],
        innovationPacks: [{ id: 'ip-1' }],
        innovationHubs: [{ id: 'hub-1' }],
      } as any);

      (
        spaceAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([{ id: 'auth-space' }]);
      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([{ id: 'auth-license' }]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([{ id: 'auth-storage' }]);
      (
        virtualContributorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([{ id: 'auth-vc' }]);
      (
        authorizationPolicyService.cloneAuthorizationPolicy as any
      ).mockReturnValue(mockAccount.authorization);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockAccount.authorization);
      (
        innovationPackAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([{ id: 'auth-ip' }]);
      (
        innovationHubAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([{ id: 'auth-hub' }]);

      const result =
        await service.applyAuthorizationPolicyForChildEntities(mockAccount);

      expect(result.length).toBeGreaterThanOrEqual(6);
      expect(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('space-1');
      expect(
        virtualContributorAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith({ id: 'vc-1' });
      expect(
        innovationPackAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(
        innovationHubAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
    });

    it('should return empty authorizations when account has no child entities', async () => {
      const mockAccount = createMockAccount();

      (
        licenseAuthorizationService.applyAuthorizationPolicy as any
      ).mockReturnValue([]);
      (
        storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        authorizationPolicyService.cloneAuthorizationPolicy as any
      ).mockReturnValue(mockAccount.authorization);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockAccount.authorization);

      const result =
        await service.applyAuthorizationPolicyForChildEntities(mockAccount);

      expect(result).toBeDefined();
      expect(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });
  });

  describe('getClonedAccountAuthExtendedForChildEntities', () => {
    it('should clone and extend authorization policy', async () => {
      const mockAccount = createMockAccount();
      const clonedAuth = {
        id: 'cloned-auth',
        credentialRules: [],
        privilegeRules: [],
      };

      (
        authorizationPolicyService.cloneAuthorizationPolicy as any
      ).mockReturnValue(clonedAuth);
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(clonedAuth);

      const result =
        await service.getClonedAccountAuthExtendedForChildEntities(mockAccount);

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.cloneAuthorizationPolicy
      ).toHaveBeenCalledWith(mockAccount.authorization);
    });
  });

  describe('extendAuthorizationPolicy (private)', () => {
    it('should throw when authorization is undefined', async () => {
      await expect(
        (service as any).extendAuthorizationPolicy(undefined, {
          type: 'test',
          resourceID: 'test',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should create multiple credential rules and append them', async () => {
      const mockAuth = {
        id: 'auth-1',
        credentialRules: [],
        privilegeRules: [],
      };
      const credential = { type: 'test', resourceID: 'test' };

      (
        authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess as any
      ).mockReturnValue(mockAuth);
      (
        authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
      ).mockReturnValue({ criterias: [], cascade: false });
      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockAuth);

      const result = await (service as any).extendAuthorizationPolicy(
        mockAuth,
        credential
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalled();
      // Should create rules for global roles, space reader, resources manage, transfer accept, license manage
      expect(
        authorizationPolicyService.createCredentialRuleUsingTypesOnly
      ).toHaveBeenCalledTimes(5);
      // Should create rules for host manage, create space, create VC, create innovation pack
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalledTimes(4);
    });
  });

  describe('extendAuthorizationPolicyForChildEntities (private)', () => {
    it('should throw when authorization is undefined', () => {
      expect(() =>
        (service as any).extendAuthorizationPolicyForChildEntities(undefined, {
          type: 'test',
          resourceID: 'test',
        })
      ).toThrow(EntityNotInitializedException);
    });

    it('should create credential rule for child entities', () => {
      const mockAuth = {
        id: 'auth-1',
        credentialRules: [],
        privilegeRules: [],
      };
      const credential = { type: 'test', resourceID: 'test' };

      (authorizationPolicyService.createCredentialRule as any).mockReturnValue({
        criterias: [],
        cascade: false,
      });
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as any
      ).mockReturnValue(mockAuth);

      const result = (service as any).extendAuthorizationPolicyForChildEntities(
        mockAuth,
        credential
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
      expect(
        authorizationPolicyService.appendCredentialAuthorizationRules
      ).toHaveBeenCalled();
    });
  });
});
