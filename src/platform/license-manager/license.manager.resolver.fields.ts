import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILicenseManager } from './license.manager.interface';
import { LicenseManagerService } from './license.manager.service';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';

@Resolver(() => ILicenseManager)
export class LicenseManagerResolverFields {
  constructor(private licenseManagerService: LicenseManagerService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('licensePlans', () => [ILicensePlan], {
    nullable: false,
    description: 'The License Plans in use on the platform.',
  })
  @UseGuards(GraphqlGuard)
  async licensePlans(
    @Parent() licenseManager: ILicenseManager
  ): Promise<ILicensePlan[]> {
    return await this.licenseManagerService.getLicensePlans(licenseManager.id);
  }
}
