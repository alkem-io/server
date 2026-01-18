import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { LicensingFrameworkService } from './licensing.framework.service';

@InstrumentResolver()
@Resolver()
export class LicensingFrameworkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingFrameworkService: LicensingFrameworkService
  ) {}

  @Mutation(() => ILicensePlan, {
    description: 'Create a new LicensePlan on the Licensing.',
  })
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
