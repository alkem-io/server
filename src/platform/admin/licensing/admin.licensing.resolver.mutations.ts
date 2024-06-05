import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { AssignLicensePlanToAccount } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { LicensingService } from '@platform/licensing/licensing.service';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { AdminLicensingService } from './admin.licensing.service';

@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingService: LicensingService,
    private adminLicensingService: AdminLicensingService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Assign the specified LicensePlan to an Account.',
  })
  @Profiling.api
  async assignLicensePlanToAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: AssignLicensePlanToAccount
  ): Promise<ILicensePlan> {
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

    return await this.adminLicensingService.assignLicensePlanToAccount(
      planData,
      licensing.id
    );
  }
}
