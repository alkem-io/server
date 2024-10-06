import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { AdminLicensingService } from './admin.licensing.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { IAccount } from '@domain/space/account/account.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';
import { LicensingFrameworkService } from '@platform/licensing-framework/licensing.framework.service';
import { ILicensingFramework } from '@platform/licensing-framework/licensing.framework.interface';
import { SpaceLicenseService } from '@domain/space/space/space.service.license';
import { SpaceService } from '@domain/space/space/space.service';
import { AccountService } from '@domain/space/account/account.service';

@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private spaceLicenseService: SpaceLicenseService,
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private accountLicenseService: AccountLicenseService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    private adminLicensingService: AdminLicensingService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Assign the specified LicensePlan to an Account.',
  })
  @Profiling.api
  async assignLicensePlanToAccount(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account = await this.adminLicensingService.assignLicensePlanToAccount(
      planData,
      licensing.id
    );
    // TODO: Need to trigger for now both an auth reset and a license reset as Spaces are not yet setup to work with Licenses
    // In principle only a license reset should be needed as not changing any authorizations
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.accountService.getAccountOrFail(account.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Assign the specified LicensePlan to a Space.',
  })
  @Profiling.api
  async assignLicensePlanToSpace(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.assignLicensePlanToSpace(
      planData,
      licensing.id
    );
    // TODO: Need to trigger for now both an auth reset and a license reset as Spaces are not yet setup to work with Licenses
    // Need to trigger an authorization reset as some license credentials are used in auth policy e.g. VCs feature flag
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.spaceService.getSpaceOrFail(space.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Revokes the specified LicensePlan on an Account.',
  })
  @Profiling.api
  async revokeLicensePlanFromAccount(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.accountID})`
    );

    const account =
      await this.adminLicensingService.revokeLicensePlanFromAccount(
        planData,
        licensing.id
      );
    // TODO: Need to trigger for now both an auth reset and a license reset as Spaces are not yet setup to work with Licenses
    // In principle only a license reset should be needed as not changing any authorizations
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    const updatedLicenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(updatedLicenses);

    return this.accountService.getAccountOrFail(account.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Revokes the specified LicensePlan on a Space.',
  })
  @Profiling.api
  async revokeLicensePlanFromSpace(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan (${planData.licensePlanID}) on account (${planData.spaceID})`
    );

    const space = await this.adminLicensingService.revokeLicensePlanFromSpace(
      planData,
      licensing.id
    );
    // TODO: Need to trigger for now both an auth reset and a license reset as Spaces are not yet setup to work with Licenses
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    const updatedLicenses = await this.spaceLicenseService.applyLicensePolicy(
      space.id
    );
    await this.licenseService.saveAll(updatedLicenses);
    return this.spaceService.getSpaceOrFail(space.id);
  }
}
