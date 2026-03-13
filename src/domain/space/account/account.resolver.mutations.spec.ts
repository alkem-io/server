import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { AccountLicensePlanService } from '../account.license.plan/account.license.plan.service';
import { SpaceService } from '../space/space.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { SpaceLicenseService } from '../space/space.service.license';
import { AccountResolverMutations } from './account.resolver.mutations';
import { AccountService } from './account.service';
import { AccountAuthorizationService } from './account.service.authorization';
import { AccountLicenseService } from './account.service.license';

describe('AccountResolverMutations', () => {
  let resolver: AccountResolverMutations;
  let accountService: AccountService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let spaceService: SpaceService;
  let spaceAuthorizationService: SpaceAuthorizationService;
  let spaceLicenseService: SpaceLicenseService;
  let licenseService: LicenseService;
  let accountAuthorizationService: AccountAuthorizationService;
  let accountLicenseService: AccountLicenseService;
  let accountLicensePlanService: AccountLicensePlanService;
  let notificationPlatformAdapter: NotificationPlatformAdapter;
  let innovationHubService: InnovationHubService;
  let innovationHubAuthorizationService: InnovationHubAuthorizationService;
  let virtualContributorService: VirtualContributorService;
  let virtualActorLookupService: VirtualActorLookupService;
  let virtualContributorAuthorizationService: VirtualContributorAuthorizationService;
  let innovationPackService: InnovationPackService;
  let innovationPackAuthorizationService: InnovationPackAuthorizationService;
  let temporaryStorageService: TemporaryStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AccountResolverMutations);
    accountService = module.get(AccountService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    spaceService = module.get(SpaceService);
    spaceAuthorizationService = module.get(SpaceAuthorizationService);
    spaceLicenseService = module.get(SpaceLicenseService);
    licenseService = module.get(LicenseService);
    accountAuthorizationService = module.get(AccountAuthorizationService);
    accountLicenseService = module.get(AccountLicenseService);
    accountLicensePlanService = module.get(AccountLicensePlanService);
    notificationPlatformAdapter = module.get(NotificationPlatformAdapter);
    innovationHubService = module.get(InnovationHubService);
    innovationHubAuthorizationService = module.get(
      InnovationHubAuthorizationService
    );
    virtualContributorService = module.get(VirtualContributorService);
    virtualActorLookupService = module.get(VirtualActorLookupService);
    virtualContributorAuthorizationService = module.get(
      VirtualContributorAuthorizationService
    );
    innovationPackService = module.get(InnovationPackService);
    innovationPackAuthorizationService = module.get(
      InnovationPackAuthorizationService
    );
    temporaryStorageService = module.get(TemporaryStorageService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createSpace', () => {
    const actorContext = { actorID: 'actor-1', isAnonymous: false } as any;
    const spaceData = { accountID: 'account-1' } as any;

    it('should create space, apply policies, and notify', async () => {
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
      } as any;
      const space = {
        id: 'space-1',
        about: { profile: { displayName: 'Test' } },
        community: { id: 'comm-1' },
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(true);
      vi.mocked(accountService.createSpaceOnAccount).mockResolvedValue(space);
      vi.mocked(spaceService.save).mockResolvedValue(space);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(spaceLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(
        notificationPlatformAdapter.platformSpaceCreated
      ).mockResolvedValue(undefined as any);

      const result = await resolver.createSpace(actorContext, spaceData);

      expect(result).toBe(space);
      expect(accountService.createSpaceOnAccount).toHaveBeenCalledWith(
        spaceData,
        actorContext
      );
      expect(
        notificationPlatformAdapter.platformSpaceCreated
      ).toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when space profile or community is missing', async () => {
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
      } as any;
      const spaceNoProfile = {
        id: 'space-1',
        about: { profile: undefined },
        community: undefined,
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(true);
      vi.mocked(accountService.createSpaceOnAccount).mockResolvedValue(
        spaceNoProfile
      );
      vi.mocked(spaceService.save).mockResolvedValue(spaceNoProfile);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(spaceLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(spaceNoProfile);

      await expect(
        resolver.createSpace(actorContext, spaceData)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('createInnovationHub', () => {
    it('should create innovation hub with authorization policies', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const createData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
        storageAggregator: { id: 'sa-1' },
      } as any;
      const hub = { id: 'hub-1' } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(true);
      vi.mocked(innovationHubService.createInnovationHub).mockResolvedValue(
        hub
      );
      vi.mocked(innovationHubService.save).mockResolvedValue(hub);
      vi.mocked(
        innovationHubAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(innovationHubService.getInnovationHubOrFail).mockResolvedValue(
        hub
      );

      const result = await resolver.createInnovationHub(
        actorContext,
        createData
      );
      expect(result).toBe(hub);
    });
  });

  describe('createVirtualContributor', () => {
    it('should create virtual contributor and move temporary docs', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const vcData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
      } as any;
      const vc = { id: 'vc-1' } as any;
      const storageBucket = { id: 'bucket-1' } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(true);
      vi.mocked(
        accountService.createVirtualContributorOnAccount
      ).mockResolvedValue(vc);
      vi.mocked(virtualContributorService.getStorageBucket).mockResolvedValue(
        storageBucket
      );
      vi.mocked(
        temporaryStorageService.moveTemporaryDocuments
      ).mockResolvedValue(undefined as any);
      vi.mocked(
        virtualContributorAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        virtualActorLookupService.getVirtualContributorByIdOrFail
      ).mockResolvedValue(vc);

      const result = await resolver.createVirtualContributor(
        actorContext,
        vcData
      );
      expect(result).toBe(vc);
      expect(
        temporaryStorageService.moveTemporaryDocuments
      ).toHaveBeenCalledWith(vcData, storageBucket);
    });
  });

  describe('createInnovationPack', () => {
    it('should create innovation pack with authorization', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const ipData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
      } as any;
      const ip = { id: 'ip-1' } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(true);
      vi.mocked(accountService.createInnovationPackOnAccount).mockResolvedValue(
        ip
      );
      vi.mocked(
        accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities
      ).mockResolvedValue({ id: 'cloned-auth' } as any);
      vi.mocked(
        innovationPackAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(ip);

      const result = await resolver.createInnovationPack(actorContext, ipData);
      expect(result).toBe(ip);
    });
  });

  describe('authorizationPolicyResetOnAccount', () => {
    it('should reset authorization and license policies', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const resetData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(
        accountAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(accountLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);

      const _result = await resolver.authorizationPolicyResetOnAccount(
        actorContext,
        resetData
      );
      expect(accountService.getAccountOrFail).toHaveBeenCalledTimes(2);
      expect(
        accountAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(account);
    });
  });

  describe('licenseResetOnAccount', () => {
    it('should reset license policy', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const resetData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(accountLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);

      await resolver.licenseResetOnAccount(actorContext, resetData);
      expect(accountLicenseService.applyLicensePolicy).toHaveBeenCalledWith(
        'account-1'
      );
    });
  });

  describe('updateBaselineLicensePlanOnAccount', () => {
    it('should update baseline license plan and reapply license policy', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const updateData = { accountID: 'account-1' } as any;
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        baselineLicensePlan: {},
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(accountLicensePlanService.updateLicensePlan).mockReturnValue({
        updated: true,
      } as any);
      vi.mocked(accountService.save).mockResolvedValue(account);
      vi.mocked(accountLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);

      await resolver.updateBaselineLicensePlanOnAccount(
        actorContext,
        updateData
      );
      expect(accountLicensePlanService.updateLicensePlan).toHaveBeenCalled();
      expect(accountService.save).toHaveBeenCalled();
    });
  });

  describe('transferInnovationHubToAccount', () => {
    it('should transfer innovation hub to target account', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const transferData = {
        innovationHubID: 'hub-1',
        targetAccountID: 'target-1',
      } as any;
      const hub = {
        id: 'hub-1',
        account: { authorization: { id: 'auth-1' } },
      } as any;
      const targetAccount = {
        id: 'target-1',
        authorization: { id: 'auth-2' },
      } as any;

      vi.mocked(innovationHubService.getInnovationHubOrFail).mockResolvedValue(
        hub
      );
      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(
        targetAccount
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(innovationHubService.save).mockResolvedValue(hub);
      vi.mocked(
        accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities
      ).mockResolvedValue({ id: 'cloned' } as any);
      vi.mocked(
        innovationHubAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.transferInnovationHubToAccount(actorContext, transferData);
      expect(hub.account).toBe(targetAccount);
    });

    it('should throw when current account is missing', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const transferData = {
        innovationHubID: 'hub-1',
        targetAccountID: 'target-1',
      } as any;
      const hub = { id: 'hub-1', account: undefined } as any;
      const targetAccount = {
        id: 'target-1',
        authorization: { id: 'auth-2' },
      } as any;

      vi.mocked(innovationHubService.getInnovationHubOrFail).mockResolvedValue(
        hub
      );
      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(
        targetAccount
      );

      await expect(
        resolver.transferInnovationHubToAccount(actorContext, transferData)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('transferSpaceToAccount', () => {
    it('should transfer space to target account', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const transferData = {
        spaceID: 'space-1',
        targetAccountID: 'target-1',
      } as any;
      const space = {
        id: 'space-1',
        account: { authorization: { id: 'auth-1' } },
      } as any;
      const targetAccount = {
        id: 'target-1',
        authorization: { id: 'auth-2' },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(
        targetAccount
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.save).mockResolvedValue(space);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.transferSpaceToAccount(actorContext, transferData);
      expect(space.account).toBe(targetAccount);
    });
  });

  describe('transferInnovationPackToAccount', () => {
    it('should transfer innovation pack to target account', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const transferData = {
        innovationPackID: 'ip-1',
        targetAccountID: 'target-1',
      } as any;
      const ip = {
        id: 'ip-1',
        account: { authorization: { id: 'auth-1' } },
      } as any;
      const targetAccount = {
        id: 'target-1',
        authorization: { id: 'auth-2' },
      } as any;

      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(ip);
      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(
        targetAccount
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(innovationPackService.save).mockResolvedValue(ip);
      vi.mocked(
        accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities
      ).mockResolvedValue({ id: 'cloned' } as any);
      vi.mocked(
        innovationPackAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(
        innovationPackService.getInnovationPackOrFail
      ).mockResolvedValue(ip);

      await resolver.transferInnovationPackToAccount(
        actorContext,
        transferData
      );
      expect(ip.account).toBe(targetAccount);
    });
  });

  describe('transferVirtualContributorToAccount', () => {
    it('should transfer virtual contributor to target account', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const transferData = {
        virtualContributorID: 'vc-1',
        targetAccountID: 'target-1',
      } as any;
      const vc = {
        id: 'vc-1',
        account: { authorization: { id: 'auth-1' } },
      } as any;
      const targetAccount = {
        id: 'target-1',
        authorization: { id: 'auth-2' },
      } as any;

      vi.mocked(
        virtualActorLookupService.getVirtualContributorByIdOrFail
      ).mockResolvedValue(vc);
      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(
        targetAccount
      );
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(virtualContributorService.save).mockResolvedValue(vc);
      vi.mocked(
        virtualContributorAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.transferVirtualContributorToAccount(
        actorContext,
        transferData
      );
      expect(vc.account).toBe(targetAccount);
    });
  });

  describe('validateSoftLicenseLimitOrFail (private, tested via createSpace)', () => {
    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const account = {
        id: 'account-1',
        authorization: undefined,
        license: { id: 'lic-1', entitlements: [] },
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);

      await expect(
        resolver.createSpace(
          { actorID: 'actor-1' } as any,
          {
            accountID: 'account-1',
          } as any
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when license is missing', async () => {
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: undefined,
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);

      await expect(
        resolver.createSpace(
          { actorID: 'actor-1' } as any,
          {
            accountID: 'account-1',
          } as any
        )
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw ValidationException when entitlement is not available and user is not platform admin', async () => {
      const account = {
        id: 'account-1',
        authorization: { id: 'auth-1' },
        license: { id: 'lic-1', entitlements: [] },
      } as any;

      vi.mocked(accountService.getAccountOrFail).mockResolvedValue(account);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(licenseService.isEntitlementAvailable).mockResolvedValue(false);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);
      vi.mocked(licenseService.getEntitlementLimit).mockReturnValue(5);

      await expect(
        resolver.createSpace(
          { actorID: 'actor-1' } as any,
          {
            accountID: 'account-1',
          } as any
        )
      ).rejects.toThrow(ValidationException);
    });
  });
});
