import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILicensingFramework } from './licensing.framework.interface';
import { LicensingFrameworkService } from './licensing.framework.service';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { ILicensePolicy } from '@platform/license-policy';

@Resolver(() => ILicensingFramework)
export class LicensingFrameworkResolverFields {
  constructor(private licensingFrameworkService: LicensingFrameworkService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('plans', () => [ILicensePlan], {
    nullable: false,
    description: 'The License Plans in use on the platform.',
  })
  @UseGuards(GraphqlGuard)
  async plans(
    @Parent() licensing: ILicensingFramework
  ): Promise<ILicensePlan[]> {
    return await this.licensingFrameworkService.getLicensePlansOrFail(
      licensing.id
    );
  }

  @ResolveField('policy', () => ILicensePolicy, {
    nullable: false,
    description: 'The LicensePolicy in use by the Licensing setup.',
  })
  policy(@Parent() licensing: ILicensingFramework): Promise<ILicensePolicy> {
    return this.licensingFrameworkService.getLicensePolicy(licensing.id);
  }
}
