import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingFrameworkService } from './licensing.framework.service';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class LicensingFrameworkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingFrameworkService: LicensingFrameworkService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Create a new LicensePlan on the Licensing.',
  })
  @Profiling.api
  async createLicensePlan(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: CreateLicensePlanOnLicensingFrameworkInput
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingFrameworkService.getLicensingOrFail(
      planData.licensingFrameworkID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.CREATE,
      `create licensePlan on licensing framework: ${licensing.id}`
    );

    return await this.licensingFrameworkService.createLicensePlan(planData);
  }
}
