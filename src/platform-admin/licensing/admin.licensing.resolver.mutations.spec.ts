import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LicenseService } from '@domain/common/license/license.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLicenseService } from '@domain/space/space/space.service.license';
import { Test, TestingModule } from '@nestjs/testing';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AdminLicensingResolverMutations } from './admin.licensing.resolver.mutations';
import { AdminLicensingService } from './admin.licensing.service';

describe('AdminLicensingResolverMutations', () => {
  let resolver: AdminLicensingResolverMutations;
  let authorizationService: Record<string, Mock>;
  let accountService: Record<string, Mock>;
  let accountLicenseService: Record<string, Mock>;
  let spaceService: Record<string, Mock>;
  let spaceLicenseService: Record<string, Mock>;
  let licensingFrameworkService: Record<string, Mock>;
  let licenseService: Record<string, Mock>;
  let adminLicensingService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminLicensingResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminLicensingResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    accountService = module.get(AccountService) as any;
    accountLicenseService = module.get(AccountLicenseService) as any;
    spaceService = module.get(SpaceService) as any;
    spaceLicenseService = module.get(SpaceLicenseService) as any;
    licensingFrameworkService = module.get(LicensingFrameworkService) as any;
    licenseService = module.get(LicenseService) as any;
    adminLicensingService = module.get(AdminLicensingService) as any;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createWingbackAccount', () => {
    it('should check authorization and create wingback account', async () => {
      const account = { id: 'acc-1', authorization: { id: 'auth-1' } };
      accountService.getAccountOrFail.mockResolvedValue(account);
      accountLicenseService.createWingbackAccount.mockResolvedValue(
        'wingback-id'
      );

      const result = await resolver.createWingbackAccount(
        actorContext,
        'acc-1'
      );

      expect(accountService.getAccountOrFail).toHaveBeenCalledWith('acc-1');
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        account.authorization,
        AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
        expect.any(String)
      );
      expect(accountLicenseService.createWingbackAccount).toHaveBeenCalledWith(
        'acc-1'
      );
      expect(result).toBe('wingback-id');
    });
  });

  describe('assignLicensePlanToAccount', () => {
    it('should use provided licensingID when specified', async () => {
      const licensing = {
        id: 'lic-1',
        authorization: { id: 'auth-lic' },
      };
      const account = { id: 'acc-1' };
      const updatedLicenses = [{ id: 'license-1' }];
      const planData = {
        licensePlanID: 'plan-1',
        accountID: 'acc-1',
        licensingID: 'lic-1',
      } as any;

      licensingFrameworkService.getLicensingOrFail.mockResolvedValue(licensing);
      adminLicensingService.assignLicensePlanToAccount.mockResolvedValue(
        account
      );
      accountLicenseService.applyLicensePolicy.mockResolvedValue(
        updatedLicenses
      );
      accountService.getAccountOrFail.mockResolvedValue(account);

      const result = await resolver.assignLicensePlanToAccount(
        actorContext,
        planData
      );

      expect(licensingFrameworkService.getLicensingOrFail).toHaveBeenCalledWith(
        'lic-1'
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        licensing.authorization,
        AuthorizationPrivilege.GRANT,
        expect.any(String)
      );
      expect(
        adminLicensingService.assignLicensePlanToAccount
      ).toHaveBeenCalledWith(planData, 'lic-1');
      expect(licenseService.saveAll).toHaveBeenCalledWith(updatedLicenses);
      expect(result).toEqual(account);
    });

    it('should use default licensing when licensingID is not provided', async () => {
      const licensing = {
        id: 'default-lic',
        authorization: { id: 'auth-lic' },
      };
      const account = { id: 'acc-1' };
      const planData = {
        licensePlanID: 'plan-1',
        accountID: 'acc-1',
      } as any;

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        licensing
      );
      adminLicensingService.assignLicensePlanToAccount.mockResolvedValue(
        account
      );
      accountLicenseService.applyLicensePolicy.mockResolvedValue([]);
      accountService.getAccountOrFail.mockResolvedValue(account);

      await resolver.assignLicensePlanToAccount(actorContext, planData);

      expect(
        licensingFrameworkService.getDefaultLicensingOrFail
      ).toHaveBeenCalled();
    });
  });

  describe('assignLicensePlanToSpace', () => {
    it('should assign license plan and apply policy', async () => {
      const licensing = {
        id: 'lic-1',
        authorization: { id: 'auth-lic' },
      };
      const space = { id: 'space-1' };
      const updatedLicenses = [{ id: 'license-1' }];
      const planData = {
        licensePlanID: 'plan-1',
        spaceID: 'space-1',
        licensingID: 'lic-1',
      } as any;

      licensingFrameworkService.getLicensingOrFail.mockResolvedValue(licensing);
      adminLicensingService.assignLicensePlanToSpace.mockResolvedValue(space);
      spaceLicenseService.applyLicensePolicy.mockResolvedValue(updatedLicenses);
      spaceService.getSpaceOrFail.mockResolvedValue(space);

      const result = await resolver.assignLicensePlanToSpace(
        actorContext,
        planData
      );

      expect(
        adminLicensingService.assignLicensePlanToSpace
      ).toHaveBeenCalledWith(planData, 'lic-1');
      expect(licenseService.saveAll).toHaveBeenCalledWith(updatedLicenses);
      expect(result).toEqual(space);
    });

    it('should use default licensing when licensingID is not provided', async () => {
      const licensing = {
        id: 'default-lic',
        authorization: { id: 'auth-lic' },
      };
      const planData = {
        licensePlanID: 'plan-1',
        spaceID: 'space-1',
      } as any;

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        licensing
      );
      adminLicensingService.assignLicensePlanToSpace.mockResolvedValue({
        id: 'space-1',
      });
      spaceLicenseService.applyLicensePolicy.mockResolvedValue([]);
      spaceService.getSpaceOrFail.mockResolvedValue({ id: 'space-1' });

      await resolver.assignLicensePlanToSpace(actorContext, planData);

      expect(
        licensingFrameworkService.getDefaultLicensingOrFail
      ).toHaveBeenCalled();
    });
  });

  describe('revokeLicensePlanFromAccount', () => {
    it('should revoke license plan and apply policy', async () => {
      const licensing = {
        id: 'lic-1',
        authorization: { id: 'auth-lic' },
      };
      const account = { id: 'acc-1' };
      const updatedLicenses = [{ id: 'license-1' }];
      const planData = {
        licensePlanID: 'plan-1',
        accountID: 'acc-1',
        licensingID: 'lic-1',
      } as any;

      licensingFrameworkService.getLicensingOrFail.mockResolvedValue(licensing);
      adminLicensingService.revokeLicensePlanFromAccount.mockResolvedValue(
        account
      );
      accountLicenseService.applyLicensePolicy.mockResolvedValue(
        updatedLicenses
      );
      accountService.getAccountOrFail.mockResolvedValue(account);

      const result = await resolver.revokeLicensePlanFromAccount(
        actorContext,
        planData
      );

      expect(
        adminLicensingService.revokeLicensePlanFromAccount
      ).toHaveBeenCalledWith(planData, 'lic-1');
      expect(licenseService.saveAll).toHaveBeenCalledWith(updatedLicenses);
      expect(result).toEqual(account);
    });

    it('should use default licensing when licensingID is not provided', async () => {
      const licensing = {
        id: 'default-lic',
        authorization: { id: 'auth-lic' },
      };
      const planData = {
        licensePlanID: 'plan-1',
        accountID: 'acc-1',
      } as any;

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        licensing
      );
      adminLicensingService.revokeLicensePlanFromAccount.mockResolvedValue({
        id: 'acc-1',
      });
      accountLicenseService.applyLicensePolicy.mockResolvedValue([]);
      accountService.getAccountOrFail.mockResolvedValue({ id: 'acc-1' });

      await resolver.revokeLicensePlanFromAccount(actorContext, planData);

      expect(
        licensingFrameworkService.getDefaultLicensingOrFail
      ).toHaveBeenCalled();
    });
  });

  describe('revokeLicensePlanFromSpace', () => {
    it('should revoke license plan and apply policy', async () => {
      const licensing = {
        id: 'lic-1',
        authorization: { id: 'auth-lic' },
      };
      const space = { id: 'space-1' };
      const updatedLicenses = [{ id: 'license-1' }];
      const planData = {
        licensePlanID: 'plan-1',
        spaceID: 'space-1',
        licensingID: 'lic-1',
      } as any;

      licensingFrameworkService.getLicensingOrFail.mockResolvedValue(licensing);
      adminLicensingService.revokeLicensePlanFromSpace.mockResolvedValue(space);
      spaceLicenseService.applyLicensePolicy.mockResolvedValue(updatedLicenses);
      spaceService.getSpaceOrFail.mockResolvedValue(space);

      const result = await resolver.revokeLicensePlanFromSpace(
        actorContext,
        planData
      );

      expect(
        adminLicensingService.revokeLicensePlanFromSpace
      ).toHaveBeenCalledWith(planData, 'lic-1');
      expect(licenseService.saveAll).toHaveBeenCalledWith(updatedLicenses);
      expect(result).toEqual(space);
    });

    it('should use default licensing when licensingID is not provided', async () => {
      const licensing = {
        id: 'default-lic',
        authorization: { id: 'auth-lic' },
      };
      const planData = {
        licensePlanID: 'plan-1',
        spaceID: 'space-1',
      } as any;

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        licensing
      );
      adminLicensingService.revokeLicensePlanFromSpace.mockResolvedValue({
        id: 'space-1',
      });
      spaceLicenseService.applyLicensePolicy.mockResolvedValue([]);
      spaceService.getSpaceOrFail.mockResolvedValue({ id: 'space-1' });

      await resolver.revokeLicensePlanFromSpace(actorContext, planData);

      expect(
        licensingFrameworkService.getDefaultLicensingOrFail
      ).toHaveBeenCalled();
    });
  });

  describe('resetLicenseOnAccounts', () => {
    it('should reset license on all accounts', async () => {
      const licensing = {
        id: 'default-lic',
        authorization: { id: 'auth-lic' },
      };
      const accounts = [{ id: 'acc-1' }, { id: 'acc-2' }];

      licensingFrameworkService.getDefaultLicensingOrFail.mockResolvedValue(
        licensing
      );
      adminLicensingService.getAllAccounts.mockResolvedValue(accounts);
      accountLicenseService.applyLicensePolicy.mockResolvedValue([]);

      await resolver.resetLicenseOnAccounts(actorContext);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        licensing.authorization,
        AuthorizationPrivilege.GRANT,
        'reset licenses on accounts'
      );
      expect(adminLicensingService.getAllAccounts).toHaveBeenCalled();
      expect(accountLicenseService.applyLicensePolicy).toHaveBeenCalledTimes(2);
    });
  });
});
