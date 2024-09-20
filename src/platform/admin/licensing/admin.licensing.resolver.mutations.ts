import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.space';
import { LicensingService } from '@platform/licensing/licensing.service';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { AdminLicensingService } from './admin.licensing.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.space';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { IAccount } from '@domain/space/account/account.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';

@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private accountAuthorizationService: AccountAuthorizationService,
    private licensingService: LicensingService,
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
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
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
    // Need to trigger an authorization reset as some license credentials are used in auth policy e.g. VCs feature flag
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return account;
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
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
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
    // Need to trigger an authorization reset as some license credentials are used in auth policy e.g. VCs feature flag
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return space;
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
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
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
    // Need to trigger an authorization reset as some license credentials are used in auth policy e.g. VCs feature flag
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return account;
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
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
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
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return space;
  }
}
