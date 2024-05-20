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
import { LicensePlanService } from '@platform/license-plan/license.plan.service';
import { UpdateLicensePlanOnLicensingInput } from './dto/license.manager.dto.update.license.plan';
import { DeleteLicensePlanOnLicensingInput } from './dto/license.manager.dto.delete.license.plan';

@Resolver()
export class LicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingService: LicensingService,
    private licensePlanService: LicensePlanService
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Deletes the specified LicensePlan.',
  })
  async deleteLicensePlan(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLicensePlanOnLicensingInput
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingService.getLicensingOrFail(
      deleteData.licensingID
    );
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteLicensePlan: ${licensePlan.id}`
    );
    return await this.licensePlanService.deleteLicensePlan(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Updates the LicensePlan.',
  })
  @Profiling.api
  async updateLicensePlan(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateLicensePlanOnLicensingInput
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingService.getLicensingOrFail(
      updateData.licensingID
    );
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      updateData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.UPDATE,
      `update LicensePlan: ${licensePlan.id}`
    );

    return await this.licensePlanService.update(updateData);
  }
}
