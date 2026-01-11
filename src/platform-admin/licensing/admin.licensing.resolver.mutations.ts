import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { AdminLicensingService } from './admin.licensing.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';
import { ISpace } from '@domain/space/space/space.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { ILicensingFramework } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.interface';
import { SpaceLicenseService } from '@domain/space/space/space.service.license';
import { SpaceService } from '@domain/space/space/space.service';
import { AccountService } from '@domain/space/account/account.service';
import { UUID } from '@domain/common/scalars';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private spaceService: SpaceService,
    private spaceLicenseService: SpaceLicenseService,
    private accountService: AccountService,
    private accountLicenseService: AccountLicenseService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    private adminLicensingService: AdminLicensingService
  ) {}

  @Mutation(() => String, {
    description: 'Creates an account in Wingback',
  })
  async createWingbackAccount(
    @CurrentActor() actorContext: ActorContext,
    @Args('accountID', { type: () => UUID }) accountID: string
  ): Promise<string> {
    const account = await this.accountService.getAccountOrFail(accountID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      account.authorization,
      AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
      `create Wingback account for account (${accountID})`
    );

    return this.accountLicenseService.createWingbackAccount(accountID);
  }

  @Mutation(() => IAccount, {
    description: 'Assign the specified LicensePlan to an Account.',
  })
  async assignLicensePlanToAccount(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: AssignLicensePlanToAccount
  ): Promise<IAccount> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account = await this.adminLicensingService.assignLicensePlanToAccount(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.accountService.getAccountOrFail(account.id);
  }

  @Mutation(() => ISpace, {
    description: 'Assign the specified LicensePlan to a Space.',
  })
  @Profiling.api
  async assignLicensePlanToSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: AssignLicensePlanToSpace
  ): Promise<ISpace> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.assignLicensePlanToSpace(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => IAccount, {
    description: 'Revokes the specified LicensePlan on an Account.',
  })
  @Profiling.api
  async revokeLicensePlanFromAccount(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: RevokeLicensePlanFromAccount
  ): Promise<IAccount> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account =
      await this.adminLicensingService.revokeLicensePlanFromAccount(
        planData,
        licensing.id
      );

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.accountService.getAccountOrFail(account.id);
  }

  @Mutation(() => ISpace, {
    description: 'Revokes the specified LicensePlan on a Space.',
  })
  @Profiling.api
  async revokeLicensePlanFromSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: RevokeLicensePlanFromSpace
  ): Promise<ISpace> {
    let licensing: ILicensingFramework | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.revokeLicensePlanFromSpace(
      planData,
      licensing.id
    );

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);
    return this.spaceService.getSpaceOrFail(space.id);
  }

  @Mutation(() => ISpace, {
    description: 'Reset all license plans on Accounts',
  })
  @Profiling.api
  async resetLicenseOnAccounts(
    @CurrentActor() actorContext: ActorContext
  ): Promise<void> {
    const licensing =
      await this.licensingFrameworkService.getDefaultLicensingOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      'reset licenses on accounts'
    );

    const accounts = await this.adminLicensingService.getAllAccounts();
    for (const account of accounts) {
      const updatedLicenses =
        await this.accountLicenseService.applyLicensePolicy(account.id);
      await this.licenseService.saveAll(updatedLicenses);
    }
  }
}
