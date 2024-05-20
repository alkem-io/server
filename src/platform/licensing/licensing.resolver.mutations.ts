import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingService } from './licensing.service';
import { CreateLicensePlanOnLicensingInput } from './dto/license.manager.dto.create.license.plan';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';

@Resolver()
export class LicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingService: LicensingService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Create a new LicensePlan on the Licensing.',
  })
  @Profiling.api
  async createLicensePlan(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: CreateLicensePlanOnLicensingInput
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingService.getLicensingOrFail(
      planData.licensingID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.CREATE,
      `create licensePlan on licensing: ${licensing.id}`
    );

    return await this.licensingService.createLicensePlan(planData);
  }
}
