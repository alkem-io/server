import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicenseManagerService } from './license.manager.service';
import { CreateLicensePlanOnLicenseManagerInput } from './dto/license.manager.dto.create.license.plan';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/license-plan/license.plan.service';
import { UpdateLicensePlanOnLicenseManagerInput } from './dto/license.manager.dto.update.license.plan';
import { DeleteLicensePlanOnLicenseManagerInput } from './dto/license.manager.dto.delete.license.plan';

@Resolver()
export class LicenseManagerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licenseManagerService: LicenseManagerService,
    private licensePlanService: LicensePlanService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Create a new InnovatonPack on the LicenseManager.',
  })
  @Profiling.api
  async createLicensePlanOnLicenseManager(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: CreateLicensePlanOnLicenseManagerInput
  ): Promise<ILicensePlan> {
    const licenseManager =
      await this.licenseManagerService.getLicenseManagerOrFail(
        planData.licenseManagerID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      licenseManager.authorization,
      AuthorizationPrivilege.CREATE,
      `create licensePlan on licenseManager: ${licenseManager.id}`
    );

    return await this.licenseManagerService.createLicensePlan(planData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ILicensePlan, {
    description: 'Deletes the specified LicensePlan.',
  })
  async deleteLicensePlan(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteLicensePlanOnLicenseManagerInput
  ): Promise<ILicensePlan> {
    const licenseManager =
      await this.licenseManagerService.getLicenseManagerOrFail(
        deleteData.licenseManagerID
      );
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      licenseManager.authorization,
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
    @Args('updateData') updateData: UpdateLicensePlanOnLicenseManagerInput
  ): Promise<ILicensePlan> {
    const licenseManager =
      await this.licenseManagerService.getLicenseManagerOrFail(
        updateData.licenseManagerID
      );
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      updateData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      licenseManager.authorization,
      AuthorizationPrivilege.UPDATE,
      `update LicensePlan: ${licensePlan.id}`
    );

    return await this.licensePlanService.update(updateData);
  }
}
