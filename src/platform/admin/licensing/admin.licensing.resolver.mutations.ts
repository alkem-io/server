import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { LicensingService } from '@platform/licensing/licensing.service';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { AdminLicensingService } from './admin.licensing.service';
import { IAccount } from '@domain/space/account/account.interface';
import { RevokeLicensePlanFromAccount } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
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
      `assign licensePlan on licensing: ${licensing.id}`
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
      `revoke licensePlan on licensing: ${licensing.id}`
    );

    return await this.adminLicensingService.revokeLicensePlanFromAccount(
      planData,
      licensing.id
    );
  }
}
